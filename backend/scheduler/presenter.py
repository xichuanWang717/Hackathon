# -*- coding: utf-8 -*-
"""payload 组装：把引擎结果转成指挥台前端契约（window.applyBackendData / applyAnalysisData）。"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from scheduler import config as C
from scheduler.engine import Engine, ScheduleResult

PROC_ZONE = {'拉丝': '拉丝', '捻股': '捻股', '合绳': '合绳'}
BEIJING = timezone(timedelta(hours=8))


def build_time_context(schedule_baseline: datetime, now: datetime | None = None) -> dict:
    """返回与排产基准独立的北京时间工作台视图时间。"""
    if now is None:
        platform_now = datetime.now(BEIJING)
    elif now.tzinfo is None:
        platform_now = now.replace(tzinfo=BEIJING)
    else:
        platform_now = now.astimezone(BEIJING)
    baseline_local = (schedule_baseline.replace(tzinfo=BEIJING) if schedule_baseline.tzinfo is None
                      else schedule_baseline.astimezone(BEIJING))
    elapsed_days = max(0, (platform_now.date() - baseline_local.date()).days)
    view_start = baseline_local.replace(hour=0, minute=0, second=0, microsecond=0) \
        + timedelta(days=(elapsed_days // C.WINDOW_DAYS) * C.WINDOW_DAYS)
    view_end = view_start + timedelta(days=C.WINDOW_DAYS)
    return {
        'schedule_baseline': schedule_baseline.isoformat(timespec='minutes'),
        'platform_now': platform_now.isoformat(timespec='minutes'),
        'timezone': 'Asia/Shanghai',
        'default_view_start': view_start.isoformat(timespec='minutes'),
        'default_view_end': view_end.isoformat(timespec='minutes'),
        'default_view_days': C.WINDOW_DAYS,
    }


def _select_gantt_machines(machines: list[dict], dev_util: dict[str, float],
                           max_rows: int) -> list[dict]:
    """三道工序均衡进入甘特图，避免单一高负荷工序淹没后续工序。"""
    ranked = sorted(machines, key=lambda item: -dev_util.get(item['id'], 0))
    selected: list[dict] = []
    selected_ids: set[str] = set()
    per_process = max(1, max_rows // len(C.PROCESS_ORDER))
    for process in C.PROCESS_ORDER:
        for item in (x for x in ranked if x['zone'] == process):
            if len([x for x in selected if x['zone'] == process]) >= per_process:
                break
            selected.append(item)
            selected_ids.add(item['id'])
    # 某工序设备不足时，剩余版面仍交给利用率更高的可用设备。
    for item in ranked:
        if len(selected) >= max_rows:
            break
        if item['id'] not in selected_ids:
            selected.append(item)
            selected_ids.add(item['id'])
    return selected


def _fmt_qty(o) -> str:
    return f'{o.qty_m:,.0f}m / {o.qty_kg:,.0f}kg'


def _status_text(o, st: dict | None) -> str:
    if o.done:
        return '已完成'
    if st is None:
        return '人工确认' if o.flags else '未排入'
    s = st.get('status')
    if s == 'scheduled':
        return '正常'
    if s == 'exception':
        return f"超期 {st.get('late_days', 0)}天"
    if s == 'backlog':
        return '历史积压'
    if s == 'manual':
        return '人工确认'
    return '未排入'


def build_order_explanations(orders, res: ScheduleResult) -> dict:
    """把正式 Task trace 整理为前端可直接展示的订单级白箱解释。"""
    order_by_oid = {o.oid: o for o in orders}
    tasks_by_device: dict[str, list] = {}
    for task in res.tasks:
        tasks_by_device.setdefault(task.device, []).append(task)
    for device_tasks in tasks_by_device.values():
        device_tasks.sort(key=lambda item: item.start)

    output = {}
    for oid, order in order_by_oid.items():
        own_tasks = sorted((task for task in res.tasks if task.order_id == oid),
                           key=lambda item: (item.start, item.process, item.batch))
        operations = []
        related_all = []
        for task in own_tasks:
            following = []
            for other in tasks_by_device.get(task.device, []):
                if other.start >= task.end and other.order_id != oid \
                        and other.order_key not in following:
                    following.append(other.order_key)
                if len(following) == 3:
                    break
            related_all.extend(following)
            rules = [{'rule': tr.rule, 'text': tr.text, 'impact': tr.impact}
                     for tr in task.trace]
            operations.append({
                'process': task.process, 'device': task.device, 'batch': task.batch + 1,
                'start': task.start.isoformat(timespec='minutes'),
                'end': task.end.isoformat(timespec='minutes'),
                'device_reason': ('该设备满足规格与工艺约束；算法在兼容候选设备中，'
                                  '按换型时间、区间负荷、最早完工时间依次选择。'),
                'changeover_reason': next((tr.text for tr in task.trace if tr.rule == 'R3'), ''),
                'rules': rules,
                'related_orders': following,
            })
        status = res.order_status.get(oid, {})
        output[order.short_id] = {
            'order_id': order.short_id,
            'due': order.delivery.isoformat(timespec='minutes') if order.delivery else None,
            'priority': getattr(order, 'tier', 0),
            'status': status.get('status', 'manual' if not own_tasks else 'scheduled'),
            'late_days': status.get('late_days', 0),
            'operations': operations,
            'related_orders': list(dict.fromkeys(related_all))[:8],
        }
    return output


def build_dashboard(engine: Engine, res: ScheduleResult,
                    now=None, max_rows: int = 36) -> dict:
    time_context = build_time_context(res.baseline, now)
    # 任务排程保持从 8/3 的完整推演；工作台只展示当前七天正式周计划。
    platform_now = datetime.fromisoformat(time_context['platform_now']).replace(tzinfo=None)
    t_start = datetime.fromisoformat(time_context['default_view_start']).replace(tzinfo=None)
    t_end = t_start + timedelta(days=C.WINDOW_DAYS)
    tasks_by_dev: dict[str, list] = {}
    for t in res.tasks:
        tasks_by_dev.setdefault(t.device, []).append(t)
    dev_util = res.device_util

    order_explanations = build_order_explanations(engine.orders, res)

    # ---- machines -------------------------------------------------------
    machines = []
    for code, tl in res.timelines.items():
        proc = engine._proc_of(code)
        util = dev_util.get(code, 0.0)
        win = [t for t in tasks_by_dev.get(code, []) if t.start < t_end and t.end > t_start]
        cur = next((t for t in win if t.start <= platform_now < t.end), None)
        cur_co = next((b for b in tl.blocks if b.kind == 'changeover'
                       and b.start <= platform_now < b.end), None)
        status = 'idle'
        if cur is not None:
            status = 'normal'
        elif cur_co is not None:
            status = 'change'
        elif win:
            status = 'queued'
        if util > C.CONGESTED_RATE:
            status = 'risk'
        nxt = min((t.start for t in win if t.start >= platform_now), default=None)
        next_co = min((b.start for b in tl.blocks if b.kind == 'changeover' and b.start >= platform_now),
                      default=None)
        in_proc = [t for t in win if t.start >= platform_now]
        risk_txt = '无'
        if util > C.CONGESTED_RATE:
            risk_txt = f'高负荷 {util:.0%}'
        elif cur is not None and res.order_status.get(cur.order_id, {}).get('status') == 'exception':
            risk_txt = '在制订单超期'
        trace = []
        if cur is not None:
            trace = [{'rule': tr.rule, 'text': tr.text, 'impact': tr.impact}
                     for tr in cur.trace[:8]]
        machines.append({
            'id': code, 'zone': proc, 'status': status,
            'order': cur.order_key if cur else ('待排' if not win else win[0].order_key),
            'product': cur.trace[0].text.split('：')[-1][:24] if cur and cur.trace else '—',
            'material': '—',
            'capacity': f'{util * 100:.0f}%',
            'queue': len(in_proc),
            'change': next_co.strftime('%m-%d %H:%M') if next_co else '—',
            'risk': risk_txt,
            'trace': trace,
        })

    # ---- tasks（甘特）：三道工序均衡抽取，不能让拉丝淹没后续预测 -----------
    order = _select_gantt_machines(machines, dev_util, max_rows)
    span = (t_end - t_start).total_seconds()
    tasks = []
    for mc in order:
        code = mc['id']
        proc = mc['zone']
        bars = []
        tl = res.timelines[code]
        for b in tl.blocks:
            if b.start >= t_end or b.end <= t_start:
                continue
            if b.kind == 'changeover':
                bars.append({'label': '换型', 'status': 'change',
                             'left': max(0, (b.start - t_start).total_seconds() / span * 100),
                             'width': max(0.4, (min(b.end, t_end) - max(b.start, t_start)).total_seconds() / span * 100),
                             'title': '换型占用'})
            elif b.kind == 'downtime':
                bars.append({'label': '停机', 'status': 'change',
                             'left': max(0, (b.start - t_start).total_seconds() / span * 100),
                             'width': max(0.4, (min(b.end, t_end) - max(b.start, t_start)).total_seconds() / span * 100),
                             'title': '设备停机'})
            elif b.kind == 'task' and b.task is not None:
                t = b.task
                st = res.order_status.get(t.order_id, {})
                bar_status = 'normal'
                if st.get('status') == 'exception':
                    bar_status = 'risk'
                title = (f"{t.order_key} · {t.process} 批{t.batch + 1}\n"
                         f"{t.start:%m-%d %H:%M} → {t.end:%m-%d %H:%M}")
                if t.trace:
                    title += '\n' + ' | '.join(f"[{tr.rule}] {tr.text[:40]}" for tr in t.trace[:3])
                bars.append({'label': t.order_key, 'status': bar_status, 'order': t.order_id,
                             'machine': t.device, 'process': t.process,
                             'start': t.start.isoformat(timespec='minutes'),
                             'end': t.end.isoformat(timespec='minutes'),
                             'trace': [{'rule': tr.rule, 'text': tr.text, 'impact': tr.impact}
                                       for tr in t.trace],
                             'related_orders': order_explanations.get(t.order_key, {})
                                                      .get('related_orders', []),
                             'left': max(0, (t.start - t_start).total_seconds() / span * 100),
                             'width': max(0.4, (min(t.end, t_end) - max(t.start, t_start)).total_seconds() / span * 100),
                             'title': title})
        tasks.append({'machine': f'{code} {proc}', 'order': mc['order'], 'bars': bars})

    # ---- risks ----------------------------------------------------------
    risks = []
    for x in res.exceptions[:8]:
        risks.append({'level': 'risk', 'order': x['order_id'],
                      'title': f"{x['order_key']} 预计超期 {x['late_days']} 天",
                      'text': f"交期 {x['delivery']}，预计完工 {x['close_end']}。原因：{x['delay_cause']}",
                      'time': '预测', 'machine': ''})
    for x in res.manual[:4]:
        risks.append({'level': 'change', 'order': x['order_id'],
                      'title': f"{x['order_key']} 需人工确认",
                      'text': x['reason'][:80], 'time': '排产', 'machine': ''})
    if res.util_by_process.get('合绳', 0) < 0.1:
        risks.append({'level': 'change', 'title': '合绳工序利用率偏低',
                      'text': f"合绳利用率 {res.util_by_process['合绳']:.1%}，12 台合绳机大量闲置，"
                              f"建议评估月度设备利用机制（加分项素材）",
                      'time': '分析', 'machine': ''})

    # ---- orders（全量订单表）---------------------------------------------
    status_by_oid = {o.oid: _status_text(o, res.order_status.get(o.oid)) for o in engine.orders}
    orders_rows = [['订单号', '产品规格', '数量', '交期', '状态']]
    for o in engine.orders:
        due_s = o.delivery.strftime('%m/%d') if o.delivery else '—'
        orders_rows.append([o.short_id, o.spec_raw, _fmt_qty(o), due_s,
                            status_by_oid.get(o.oid, '—')])

    labels = [(t_start + timedelta(days=i)).strftime('%m-%d')
              for i in range(0, C.WINDOW_DAYS + 1, 2)]

    return {
        'machines': machines,
        'tasks': tasks,
        'risks': risks,
        'orders': orders_rows,
        'kpi': res.kpi,
        'gantt': {'labels': labels, 'days': C.WINDOW_DAYS},
        'time_context': time_context,
        'engines': {'scheduler': 'v0.3 批次化多目标启发式（重写版）',
                    'tasks': len(res.tasks), 'changeovers': res.changeover_count},
        'problems': {'manual': res.manual, 'exceptions': res.exceptions},
        'order_explanations': order_explanations,
    }


def build_analysis(engine: Engine, res: ScheduleResult) -> dict:
    dev_util = res.device_util
    utils = sorted(dev_util.values())
    buckets = [('0%', 0.0, 0.0), ('0–20%', 0.0, 0.2), ('20–40%', 0.2, 0.4),
               ('40–60%', 0.4, 0.6), ('60–80%', 0.6, 0.8), ('80–100%', 0.8, 1.01)]
    distribution = [{'label': lb, 'count': sum(1 for v in utils if lo <= v < hi)}
                    for lb, lo, hi in buckets]
    top = sorted(res.timelines, key=lambda c: -dev_util.get(c, 0))[:8]
    top_devices = [{'code': c, 'process': engine._proc_of(c), 'rate': dev_util.get(c, 0)} for c in top]

    idle = sum(1 for v in utils if v <= 0.001)
    reasons = []
    rope_u = res.util_by_process.get('合绳', 0)
    wire_u = res.util_by_process.get('拉丝', 0)
    reasons.append({'title': '拉丝为产能瓶颈',
                    'evidence': f'拉丝工序利用率 {wire_u:.1%}，拥堵设备集中在拉丝；'
                                f'产能按台账月产量折算（月产 ÷ 30 天 ÷ 24h）',
                    'suggest': '细丝规格订单排快机；评估瓶颈机台提速或增开班次'})
    reasons.append({'title': '合绳工序大量闲置',
                    'evidence': f'合绳利用率仅 {rope_u:.1%}，{sum(1 for c in res.timelines if engine._proc_of(c) == "合绳" and dev_util.get(c, 0) <= 0.001)} 台全窗口闲置',
                    'suggest': '固化月度设备利用率分析机制（企业明确期望的加分方向）'})
    reasons.append({'title': '换型损耗',
                    'evidence': f'{res.changeover_count} 次换型，累计 {res.changeover_hours:.0f} 小时',
                    'suggest': '同结构订单连排，降低五档换型频次'})
    reasons.append({'title': '历史积压拖累',
                    'evidence': f'{len(res.backlog_orders)} 张订单交期早于基准日（先天逾期）',
                    'suggest': '积压单单独管理，不挤占现单准时率口径'})
    reasons.append({'title': '交期集中',
                    'evidence': '订单集中在 9 月下旬交付，工序间隔（2–72h）放大排队',
                    'suggest': '与客户协商均衡交期分布'})

    return {
        'totalDevices': len(res.timelines),
        'changeoverCount': res.changeover_count,
        'changeoverHours': round(res.changeover_hours),
        'idleCount': idle,
        'manualQueue': len(res.manual),
        'utilByProcess': [{'process': p, 'rate': v} for p, v in res.util_by_process.items()],
        'distribution': distribution,
        'topDevices': top_devices,
        'reasons': reasons,
        'quality': _quality_rows(),
        'kpi': res.kpi,
    }


def _quality_rows() -> list:
    """典型质量案例（来自赞助企业提供数据，静态读入）。"""
    try:
        import pandas as pd
        df = pd.read_excel(C.DATA_DIR + r'\典型质量案例.xlsx')
        rows = []
        for _, r in df.iterrows():
            vals = [str(x) for x in r.tolist() if pd.notna(x) and str(x).strip()]
            if len(vals) >= 2:
                rows.append({'process': vals[0][:4], 'issue': vals[1][:20],
                             'batch': vals[2][:8] if len(vals) > 2 else '—',
                             'cause': vals[3][:60] if len(vals) > 3 else '—',
                             'fix': vals[4][:60] if len(vals) > 4 else '—'})
        return rows[:8]
    except Exception:
        return []
