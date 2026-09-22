# -*- coding: utf-8 -*-
"""FastAPI 服务：托管「智能排产指挥台」静态页 + 排产 API（同源接入）。

启动：python server.py  →  http://127.0.0.1:8765
前端 bootstrap 由 backend-bridge.js 拉取 /api/dashboard、/api/analysis。
"""
from __future__ import annotations

import threading
import time
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from scheduler import config as C
from scheduler.bridge import CapacityIndex
from scheduler.dataloader import load_orders
from scheduler.engine import Engine
from scheduler.presenter import build_analysis, build_dashboard
from scheduler.replan import DowntimeEvent, MaterialDelayEvent, Replanner, RushOrderEvent
from scheduler.replan_publish import publish_candidate
from scheduler.policies import parse_delay_policy_row
from scheduler.events import CapacitySnapshot, DeviceEvent
from scheduler.dataset_store import validate_core_workbooks
from scheduler.official import build_official_schedule
from scheduler.schedule_history import ScheduleHistoryStore, monday_week_starts

app = FastAPI(title='智能排产引擎 V0.3', version='0.3.0')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'],
                   allow_headers=['*'])

STATE = {'ready': False, 'error': None, 'engine': None, 'base': None,
         'built_at': None, 'build_seconds': None, 'audit_log': [],
         'capacity_snapshot': None, 'building': False, 'progress': 0,
         'stage': 'idle', 'dataset_id': 'builtin', 'pending_dataset': None,
         'orders_xlsx': None, 'rated_xlsx': None, 'algorithm_metadata': {},
         'replan_candidates': {},
         'schedule_history': ScheduleHistoryStore(Path(os.getenv(
             'SCHEDULE_HISTORY_DIR', Path(__file__).resolve().parent / 'runtime' / 'history'))),
         'preview_job': {'status': 'idle', 'progress': 0, 'stage': '尚未提交试排',
                         'error': None, 'payload': None, 'job_id': None}}
_LOCK = threading.Lock()
_UPLOAD_ROOT = Path(os.getenv(
    'SCHEDULER_UPLOAD_DIR', Path(__file__).resolve().parent / 'runtime' / 'uploads'))
_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def restore_confirmed_dataset():
    """服务重启后恢复最近一次由计划员确认的企业数据版本。"""
    candidates = []
    for metadata_path in _UPLOAD_ROOT.glob('*/metadata.json'):
        try:
            metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
            if metadata.get('status') == 'confirmed' and metadata.get('confirmed_at'):
                candidates.append(metadata)
        except (OSError, json.JSONDecodeError):
            continue
    if not candidates:
        return
    metadata = max(candidates, key=lambda item: item['confirmed_at'])
    report = validate_core_workbooks(Path(metadata['orders_path']), Path(metadata['rated_path']))
    metadata.update(report)
    STATE.update(dataset_id=metadata['dataset_id'], orders_xlsx=metadata['orders_path'],
                 rated_xlsx=metadata['rated_path'], pending_dataset=metadata)


restore_confirmed_dataset()


def platform_now_beijing() -> datetime:
    return datetime.now(timezone(timedelta(hours=8))).replace(tzinfo=None)


def rebuild_historical_replays(platform_now: datetime) -> None:
    """从统一生产起点连续回放，并在每个周一截取当时可见的订单池。

    排程基准必须始终保持 8 月 3 日；若把基准移动到每周一，历史上已完成的
    工作会被清零，后续周会错误地把全部订单从头生产一次。
    """
    current_week = platform_now.replace(hour=0, minute=0, second=0, microsecond=0) \
        - timedelta(days=platform_now.weekday())
    for week_start in monday_week_starts(C.BASELINE, platform_now):
        if week_start >= current_week:
            continue
        config = C.ScheduleConfig(schedule_anchor=C.BASELINE)
        engine, result, metadata = build_official_schedule(
            orders_xlsx=STATE['orders_xlsx'], rated_xlsx=STATE['rated_xlsx'],
            config=config, as_of=week_start)
        if result.feasibility != 'feasible':
            raise RuntimeError(f'{week_start:%Y-%m-%d} 历史回放未通过硬约束校验')
        dashboard_payload = build_dashboard(engine, result, now=week_start)
        dashboard_payload['dataset'] = metadata
        week_end = week_start + timedelta(days=6)
        STATE['schedule_history'].save(
            dashboard_payload, created_by='系统回放',
            reason=f'历史排程回放 {week_start:%m-%d}—{week_end:%m-%d}',
            event_type='historical_replay',
            schedule_version='REPLAY-' + week_start.strftime('%Y%m%d'),
            replace_existing=True)


def build_once(force: bool = False) -> float:
    """构建基线排产（进程内缓存）。"""
    with _LOCK:
        if STATE['ready'] and not force:
            return STATE['build_seconds']
        STATE.update(building=True, progress=5, stage='读取企业Excel', error=None)
        t0 = time.time()
        def report_progress(percent, stage):
            STATE.update(progress=percent, stage=stage)
        platform_now = platform_now_beijing()
        engine, base, metadata = build_official_schedule(
            orders_xlsx=STATE['orders_xlsx'], rated_xlsx=STATE['rated_xlsx'],
            progress_callback=report_progress, as_of=platform_now)
        STATE.update(progress=98, stage='硬约束校验')
        if base.feasibility != 'feasible':
            codes = sorted({item['code'] for item in base.validation.get('violations', [])})
            raise RuntimeError(f'排程未通过硬约束校验，禁止发布：{codes}')
        capacity_snapshot = CapacitySnapshot({
            '拉丝': set(engine.idx.wire),
            '捻股': set(engine.idx.strand_devs),
            '合绳': set(engine.idx.rope_devs),
        })
        STATE.update(engine=engine, base=base, ready=False,
                     capacity_snapshot=capacity_snapshot,
                     algorithm_metadata=metadata, building=True,
                     progress=98, stage='生成历史周计划',
                     built_at=datetime.now().isoformat(timespec='seconds'),
                     build_seconds=round(time.time() - t0, 1))
        history_versions = STATE['schedule_history'].list_versions()
        latest_snapshot = (STATE['schedule_history'].load(history_versions[0]['schedule_version'])
                           if history_versions else None)
        latest_days = ((latest_snapshot or {}).get('dashboard', {}).get('gantt', {}).get('days'))
        if not history_versions or latest_days != C.WINDOW_DAYS:
            current_payload = build_dashboard(engine, base)
            current_payload['dataset'] = metadata
            STATE['schedule_history'].save(
                current_payload, created_by='系统', reason='七天正式周计划',
                event_type='initial_schedule')
        rebuild_historical_replays(platform_now)
        STATE.update(ready=True, building=False, progress=100, stage='完成',
                     build_seconds=round(time.time() - t0, 1))
        return STATE['build_seconds']


@app.on_event('startup')
def _startup():
    # 后台预热，接口先返回「构建中」
    threading.Thread(target=_warm, daemon=True).start()


def _warm():
    try:
        build_once()
    except Exception as e:  # noqa: BLE001
        STATE.update(error=str(e), building=False, stage='失败')


# --------------------------------------------------------------------------
@app.get('/api/health')
def health():
    return {'ok': True, 'ready': STATE['ready'], 'error': STATE['error'],
            'building': STATE['building'], 'progress': STATE['progress'],
            'stage': STATE['stage'], 'dataset_id': STATE['dataset_id'],
            'built_at': STATE['built_at'], 'build_seconds': STATE['build_seconds']}


@app.post('/api/datasets/upload')
async def upload_dataset(orders_file: UploadFile = File(...),
                         rated_file: UploadFile = File(...)):
    for item in (orders_file, rated_file):
        if not item.filename or not item.filename.lower().endswith(('.xlsx', '.xls')):
            raise HTTPException(400, f'{item.filename or "文件"} 不是Excel文件')
    dataset_id = 'DATA-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '-' + uuid.uuid4().hex[:6]
    folder = _UPLOAD_ROOT / dataset_id / 'original'
    folder.mkdir(parents=True, exist_ok=False)
    orders_path = folder / '订单信息.xlsx'
    rated_path = folder / '产品额定.xlsx'
    orders_path.write_bytes(await orders_file.read())
    rated_path.write_bytes(await rated_file.read())
    report = validate_core_workbooks(orders_path, rated_path)
    metadata = {
        'dataset_id': dataset_id, 'status': 'validated' if report['valid'] else 'invalid',
        'uploaded_at': datetime.now().isoformat(timespec='seconds'),
        'source_files': [orders_file.filename, rated_file.filename],
        'orders_path': str(orders_path), 'rated_path': str(rated_path), **report,
    }
    (folder.parent / 'metadata.json').write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
    STATE['pending_dataset'] = metadata
    return {key: value for key, value in metadata.items()
            if key not in {'orders_path', 'rated_path'}}


@app.get('/api/datasets/current')
def current_dataset():
    metadata = STATE.get('pending_dataset')
    if not metadata:
        raise HTTPException(404, '当前没有待确认或已上传的数据版本')
    return {key: value for key, value in metadata.items()
            if key not in {'orders_path', 'rated_path'}}


@app.post('/api/datasets/{dataset_id}/confirm')
def confirm_dataset(dataset_id: str):
    metadata = STATE.get('pending_dataset')
    if not metadata or metadata['dataset_id'] != dataset_id:
        raise HTTPException(404, '待确认数据版本不存在')
    if not metadata['valid']:
        raise HTTPException(409, {'message': '数据校验未通过', 'errors': metadata['errors']})
    STATE.update(dataset_id=dataset_id, orders_xlsx=metadata['orders_path'],
                 rated_xlsx=metadata['rated_path'], ready=False, progress=0,
                 stage='已确认，等待排产', error=None)
    metadata['status'] = 'confirmed'
    metadata['confirmed_at'] = datetime.now().isoformat(timespec='seconds')
    Path(metadata['orders_path']).parent.parent.joinpath('metadata.json').write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
    return {'ok': True, 'dataset_id': dataset_id, 'status': 'confirmed'}


@app.post('/api/schedule/run')
def run_schedule():
    if STATE['building']:
        raise HTTPException(409, '排产任务正在运行，请勿重复提交')
    STATE.update(ready=False, building=True, progress=1, stage='任务已提交', error=None)
    threading.Thread(target=lambda: _build_force(), daemon=True).start()
    return {'ok': True, 'job_id': STATE['dataset_id'], 'status': 'running'}


def _build_force():
    try:
        build_once(force=True)
    except Exception as exc:  # noqa: BLE001
        STATE.update(error=str(exc), building=False, stage='失败')


@app.get('/api/schedule/status')
def schedule_status():
    return {'dataset_id': STATE['dataset_id'], 'ready': STATE['ready'],
            'building': STATE['building'], 'progress': STATE['progress'],
            'stage': STATE['stage'], 'error': STATE['error'],
            'algorithm': STATE['algorithm_metadata']}


class SchedulePreviewBody(BaseModel):
    objective: str
    window_days: int = 14


@app.post('/api/schedule/preview')
def schedule_preview(body: SchedulePreviewBody):
    if body.objective not in {'on_time', 'balanced', 'utilization'}:
        raise HTTPException(400, '未知优化目标')
    if body.window_days not in {7, 14}:
        raise HTTPException(400, '排产窗口只支持7天或14天')
    if STATE['preview_job']['status'] == 'running':
        raise HTTPException(409, '已有试排任务正在运行，请等待其完成')
    job_id = 'PREVIEW-' + uuid.uuid4().hex[:10]
    STATE['preview_job'] = {'status': 'running', 'progress': 1, 'stage': '任务已提交',
                            'error': None, 'payload': None, 'job_id': job_id,
                            'objective': body.objective, 'window_days': body.window_days}
    threading.Thread(target=_build_preview,
                     args=(job_id, body.objective, body.window_days), daemon=True).start()
    return {'ok': True, 'job_id': job_id, 'status': 'running'}


def _build_preview(job_id: str, objective: str, window_days: int):
    """试排独立运行，避免 HTTP 请求在补排阶段被浏览器或代理超时中断。"""
    def report_progress(percent, stage):
        preview = STATE['preview_job']
        if preview.get('job_id') == job_id:
            preview.update(progress=percent, stage=stage)
    try:
        config = C.ScheduleConfig(horizon_days=window_days)
        engine, result, metadata = build_official_schedule(
            orders_xlsx=STATE['orders_xlsx'], rated_xlsx=STATE['rated_xlsx'],
            config=config, objective=objective, progress_callback=report_progress)
        if result.feasibility != 'feasible':
            raise RuntimeError('试排未通过硬约束校验')
        payload = build_dashboard(engine, result)
        payload['preview'] = {'objective': objective, 'window_days': window_days,
                              'algorithm': metadata}
        preview = STATE['preview_job']
        if preview.get('job_id') == job_id:
            preview.update(status='ready', progress=100, stage='试排完成', payload=payload)
    except (ValueError, RuntimeError) as exc:
        preview = STATE['preview_job']
        if preview.get('job_id') == job_id:
            preview.update(status='failed', stage='试排失败', error=str(exc))


@app.get('/api/schedule/preview/status')
def schedule_preview_status(job_id: str):
    preview = STATE['preview_job']
    if preview.get('job_id') != job_id:
        raise HTTPException(404, '试排任务不存在或已被新的任务替换')
    response = {key: value for key, value in preview.items() if key != 'payload'}
    if preview['status'] == 'ready':
        response['payload'] = preview['payload']
    return response


class AiAdviceBody(BaseModel):
    request: str = ''
    selected: dict = {}
    nearbyMachines: list = []


@app.post('/api/ai/schedule')
def ai_schedule_advice(body: AiAdviceBody):
    """无密钥时也返回可追溯的规则建议，避免前端出现不可用的 AI 假入口。"""
    selected = body.selected or {}
    device = str(selected.get('id') or selected.get('device') or '当前未选设备')
    process = str(selected.get('zone') or selected.get('process') or '当前工序')
    matching = [item for item in (body.nearbyMachines or []) if item.get('id') != device]
    alternative = str(matching[0].get('id')) if matching else '暂无同工段候选设备'
    ready = STATE['ready']
    return {'model': '规则引擎（无需外部密钥）', 'source': 'rule_engine',
            'answer': {
                'recommendation': f'先保持 {device} 的当前任务顺序；如需调整，请先对 {process} 工序执行物理可行性校验，再比较候选设备 {alternative}。',
                'risks': ([f'{device} 的建议来自当前已加载排程，仍需确认现场设备状态。'] if ready
                          else ['正式排程尚未就绪，当前建议不能替代排产校验。']),
                'actions': ['核对设备可加工规格、班次与停机窗口。', '如要插单，先生成至少两套候选方案并确认受影响订单。', '计划员确认后再发布，系统不会自动覆盖已发布计划。']}}


@app.get('/api/dashboard')
def dashboard():
    if not STATE['ready']:
        if STATE['error']:
            raise HTTPException(500, STATE['error'])
        return JSONResponse({'ok': False, 'error': 'building',
                             'message': '排产引擎预热中，请稍后重试'}, status_code=202)
    payload = build_dashboard(STATE['engine'], STATE['base'])
    payload['dataset'] = {'dataset_id': STATE['dataset_id'],
                          **STATE['algorithm_metadata']}
    return payload


@app.get('/api/schedule/history')
def schedule_history_list(month: str | None = None):
    return {'versions': STATE['schedule_history'].list_versions(month=month)}


@app.get('/api/schedule/history/{schedule_version}')
def schedule_history_detail(schedule_version: str):
    snapshot = STATE['schedule_history'].load(schedule_version)
    if snapshot is None:
        raise HTTPException(404, '历史排程版本不存在或已清理')
    return snapshot


@app.get('/api/analysis')
def analysis():
    if not STATE['ready']:
        return JSONResponse({'ok': False, 'error': 'building'}, status_code=202)
    return build_analysis(STATE['engine'], STATE['base'])


@app.get('/api/problems')
def problems():
    if not STATE['ready']:
        return JSONResponse({'ok': False, 'error': 'building'}, status_code=202)
    base = STATE['base']
    return {'manual': base.manual, 'exceptions': base.exceptions,
            'backlog_count': len(base.backlog_orders), 'done_count': len(base.done_orders)}


@app.get('/api/data-summary')
def data_summary():
    orders = STATE['engine'].orders if STATE['ready'] else load_orders()
    idx_ok = sum(1 for o in orders if o.spec is not None)
    return {'orders_total': len(orders),
            'done': sum(1 for o in orders if o.done),
            'backlog': sum(1 for o in orders if o.backlog and not o.done),
            'spec_parsed': idx_ok,
            'devices': {'拉丝': len(STATE['engine'].idx.wire) if STATE['ready'] else 47,
                        '捻股': 50, '合绳': 12},
            'baseline': C.BASELINE.isoformat(), 'window_days': C.WINDOW_DAYS}


# --------------------------------------------------------------------------
class ReplanBody(BaseModel):
    events: list


class ReplanApplyBody(BaseModel):
    candidate_version: str
    option_id: str
    confirmed_by: str
    reason: str


class PriorityBody(BaseModel):
    order_id: str
    tier: int


class DelayPolicyBody(BaseModel):
    order_id: str
    policy: str = 'hard'
    source: str = 'enterprise_manual'
    note: str = ''


class DeviceEventBody(BaseModel):
    action: str
    process: str
    device: str
    effective_at: datetime
    reason: str = ''


@app.post('/api/replan')
def replan(body: ReplanBody):
    if not STATE['ready']:
        return JSONResponse({'ok': False, 'error': 'building'}, status_code=202)
    engine, base = STATE['engine'], STATE['base']
    now = base.baseline + timedelta(hours=24)   # 演示口径：事件发生在排产基准日次日
    events = []
    for e in body.events:
        etype = e.get('type')
        try:
            if etype == 'insert':
                oid = e.get('oid', 'INSERT-001')
                if any(order.oid == oid or order.short_id == oid for order in engine.orders):
                    raise ValueError(f'订单号 {oid} 已存在')
                events.append(RushOrderEvent(
                    spec_raw=e['spec_raw'], qty_m=float(e.get('qty_m', 1000)),
                    qty_kg=float(e.get('qty_kg', 2400)),
                    due=datetime.fromisoformat(e['due']) if e.get('due')
                    else base.baseline + timedelta(days=6),
                    oid=oid, name=e.get('name', '紧急插单')))
            elif etype == 'downtime':
                start = datetime.fromisoformat(e['start']) if e.get('start') else now
                hours = float(e.get('hours', 8))
                events.append(DowntimeEvent(e['device'], start, start + timedelta(hours=hours),
                                            e.get('reason', '设备故障')))
            elif etype == 'material':
                oid = e['oid']
                oid_full = next((o.oid for o in engine.orders if o.short_id == oid), oid)
                new_start = datetime.fromisoformat(e['new_start']) if e.get('new_start') \
                    else now + timedelta(hours=float(e.get('hours', 12)))
                events.append(MaterialDelayEvent(oid_full, new_start, e.get('reason', '物料延迟')))
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(400, f'事件解析失败：{exc}') from exc
    if not events:
        raise HTTPException(400, 'events 为空')

    report = Replanner(engine, base).run(events, now=now)
    candidate_version = 'CAND-' + uuid.uuid4().hex[:12]
    out_options = []
    for o in report.options:
        rush_ids = [order.oid for order in o.inserted_orders]
        rush_tasks = [task for task in o.result.tasks if task.order_id in rush_ids]
        earliest_delivery = max((task.end for task in rush_tasks if task.process == '合绳'),
                                default=None)
        out_options.append({
            'option_id': o.option_id, 'name': o.name,
            'applicable': o.applicable and o.result.feasibility == 'feasible',
            'earliest_delivery_at': earliest_delivery.isoformat() if earliest_delivery else None,
            'kpi': o.kpi, 'impact': o.impact,
            'changes': o.changes[:40],
            'dashboard': build_dashboard(engine, o.result, now=now),
        })
    STATE['replan_candidates'][candidate_version] = {
        'baseline_version': STATE['built_at'],
        'options': {option.option_id: option for option in report.options},
        'published': False, 'published_response': None,
    }
    return {'ok': True, 'candidate_version': candidate_version,
            'baseline_kpi': report.baseline_kpi,
            'recommendation': report.recommendation, 'options': out_options}


@app.post('/api/replan/apply')
def apply_replan(body: ReplanApplyBody):
    if not STATE['ready']:
        return JSONResponse({'ok': False, 'error': 'building'}, status_code=202)
    try:
        with _LOCK:
            published = publish_candidate(
                STATE, body.candidate_version, body.option_id,
                body.confirmed_by, body.reason,
            )
            dashboard_payload = build_dashboard(STATE['engine'], STATE['base'])
            history_warning = None
            try:
                snapshot = STATE['schedule_history'].save(
                    dashboard_payload, created_by=body.confirmed_by, reason=body.reason,
                    event_type='rush_order')
            except (OSError, TypeError, ValueError) as exc:
                snapshot = None
                history_warning = f'正式计划已发布，但历史留档失败：{exc}'
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    response = {**published, 'dashboard': dashboard_payload}
    if snapshot:
        response['schedule_version'] = snapshot['schedule_version']
    if history_warning:
        response['history_warning'] = history_warning
    return response


@app.post('/api/priority')
def priority(body: PriorityBody):
    if not STATE['ready']:
        return JSONResponse({'ok': False, 'error': 'building'}, status_code=202)
    if body.tier not in (0, 1, 2):
        raise HTTPException(400, 'tier 只允许 0(紧急)/1(超时)/2(普通)')
    engine = STATE['engine']
    oid_full = next((o.oid for o in engine.orders if o.short_id == body.order_id), body.order_id)
    target = next((o for o in engine.orders if o.oid == oid_full), None)
    if target is None:
        raise HTTPException(404, f'订单 {body.order_id} 不存在')
    before = dict(STATE['base'].kpi)
    target.tier = body.tier          # 人工档位在演示期内保留（调单留痕）
    with _LOCK:
        base = engine.run()
        STATE['base'] = base
    after = dict(base.kpi)
    st = base.order_status.get(oid_full, {})
    return {'ok': True, 'order_id': body.order_id,
            'schedule_status': st.get('status', 'manual'),
            'accepted': st.get('status') == 'scheduled',
            'reason': st.get('delay_cause') or st.get('reason', ''),
            'before': before, 'after': after,
            'note': f'已按「{"紧急" if body.tier == 0 else "超时" if body.tier == 1 else "普通"}」档位重排（人工调单留痕）',
            'dashboard': build_dashboard(engine, base)}


@app.post('/api/delay-policy')
def delay_policy(body: DelayPolicyBody):
    """由企业人工导入客户延期容忍度；模型推测来源一律降级为不可延期。"""
    if not STATE['ready']:
        return JSONResponse({'ok': False, 'error': 'building'}, status_code=202)
    engine = STATE['engine']
    oid = next((o.oid for o in engine.orders if o.short_id == body.order_id), body.order_id)
    order = next((o for o in engine.orders if o.oid == oid), None)
    if order is None:
        raise HTTPException(404, f'订单 {body.order_id} 不存在')
    label = '可延期3天' if body.policy == 'tolerant_72h' else '不可延期'
    policy = parse_delay_policy_row({'延期策略': label, '来源': body.source, '备注': body.note})
    order.delay_policy = policy
    order.delay_tolerance_hours = policy.tolerance_hours
    order.policy_confirmed = policy.confirmed
    with _LOCK:
        base = engine.run()
        if base.feasibility != 'feasible':
            raise HTTPException(409, '策略变更后的排程未通过硬约束校验')
        STATE['base'] = base
        STATE['audit_log'].append({
            'action': 'set_delay_policy', 'order_id': oid, 'policy': policy.code,
            'source': body.source, 'note': body.note,
            'at': datetime.now().isoformat(timespec='seconds'),
        })
    return {'ok': True, 'order_id': body.order_id, 'policy': policy.code,
            'tolerance_hours': policy.tolerance_hours, 'confirmed': policy.confirmed,
            'explanation': policy.explanation, 'feasibility': base.feasibility}


@app.post('/api/device-event')
def device_event(body: DeviceEventBody):
    if not STATE['ready']:
        return JSONResponse({'ok': False, 'error': 'building'}, status_code=202)
    event = DeviceEvent(body.action, body.device, body.effective_at,
                        reason=body.reason, process=body.process)
    outcome = STATE['capacity_snapshot'].apply(event)
    if outcome.status != 'applied':
        raise HTTPException(409, {'code': outcome.status, 'message': outcome.message})
    STATE['capacity_snapshot'] = outcome.snapshot
    STATE['audit_log'].append({
        'action': 'device_event', 'event': body.model_dump(mode='json'),
        'at': datetime.now().isoformat(timespec='seconds'),
    })
    base = STATE['base']
    return {
        'ok': True,
        'status': outcome.status,
        'devices': {key: sorted(value) for key, value in outcome.snapshot.devices.items()},
        'kpi_scope': base.kpi.get('kpi_scope', {}),
        'note': '设备快照已更新；未开工任务需通过重排接口应用新产能',
    }


# --------------------------------------------------------------------------
# 开发期禁用静态资源缓存
# 前端 HTML 没有版本号参数，浏览器极易一直复用旧副本（表现为「改了却没生效」）。
# 这里对 HTML/JS/CSS 统一加 no-store，保证每次刷新都拿到磁盘上的最新文件。
@app.middleware('http')
async def _no_store_static(request, call_next):
    resp = await call_next(request)
    path = request.url.path
    if path == '/' or path.endswith(('.html', '.js', '.css')):
        resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
        resp.headers['Pragma'] = 'no-cache'
        resp.headers['Expires'] = '0'
    return resp


# --------------------------------------------------------------------------
# 静态托管：智能排产指挥台
_FRONTEND = Path(C.FRONTEND_DIR)
app.mount('/', StaticFiles(directory=str(_FRONTEND), html=True), name='frontend')


if __name__ == '__main__':
    import uvicorn
    print('智能排产引擎 V0.3 → http://127.0.0.1:8765 （前端：智能排产指挥台）')
    uvicorn.run(app, host='127.0.0.1', port=8765)
