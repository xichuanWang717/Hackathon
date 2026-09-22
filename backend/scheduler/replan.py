# -*- coding: utf-8 -*-
"""R10 动态重排：插单 / 设备停机 / 物料延迟，输出方案 A（最少扰动）vs 方案 B（最少延期）。

原则（对齐规范 5.7 / 5.16）：
- 以事件时刻为基准，冻结已开工任务（start < now）——永不移动；
- 方案 A 最少扰动：只处理直接受影响的任务，其余排程原样保留；
- 方案 B 最少延期：允许撤下「挡道」的未开工任务并 ASAP 重排，减小超期；
- 全部变更带原因记录，可对比、可撤销（原排程不被修改，重排在新副本上进行）。
"""
from __future__ import annotations

import copy
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from scheduler import config as C
from scheduler.bridge import Spec, parse_spec
from scheduler.dataloader import Order
from scheduler.engine import Block, Engine, ScheduleResult, Task, Trace


def assess_rush_feasibility(now: datetime, due: datetime, process_hours: list[float]) -> dict:
    """给出急单的物理下界；最高优先级不能突破加工时长和R6最小交接。"""
    handovers = max(0, len(process_hours) - 1)
    earliest = now + timedelta(hours=sum(process_hours) + handovers * C.HANDOVER_MIN_H)
    feasible = earliest <= due
    return {
        'status': 'feasible' if feasible else 'infeasible',
        'earliest_delivery_at': earliest,
        'due': due,
        'applicable': feasible,
        'reason': '可在承诺交期前完成' if feasible else '最短工艺链晚于交期，优先级无法突破物理约束',
    }


@dataclass
class InterruptProposal:
    proposal_id: str
    reason: str
    applicable: bool = False
    audit_log: list = field(default_factory=list)

    def confirm(self, actor: str):
        actor = actor.strip()
        if not actor:
            raise ValueError('强制中断必须记录计划员身份')
        self.applicable = True
        self.audit_log.append({'action': 'confirm_interrupt', 'actor': actor,
                               'at': datetime.now().isoformat(timespec='seconds'),
                               'reason': self.reason})


@dataclass
class RushOrderEvent:
    spec_raw: str
    qty_m: float
    qty_kg: float
    due: datetime
    oid: str = 'INSERT-001'
    name: str = '紧急插单'
    tier: int = 0


@dataclass
class DowntimeEvent:
    device: str
    start: datetime
    end: datetime
    reason: str = '设备故障'


@dataclass
class MaterialDelayEvent:
    oid: str                       # 订单号（内部完整号）或短号
    new_start: datetime            # 物料恢复可用时刻
    reason: str = '物料延迟'


@dataclass
class ReplanOption:
    option_id: str
    name: str
    strategy: str
    result: ScheduleResult = None
    changes: list = field(default_factory=list)
    kpi: dict = field(default_factory=dict)
    impact: dict = field(default_factory=dict)
    notes: list = field(default_factory=list)
    applicable: bool = True
    inserted_orders: list = field(default_factory=list)


@dataclass
class ReplanReport:
    events: list
    now: datetime
    options: list = field(default_factory=list)
    recommendation: dict = field(default_factory=dict)
    baseline_kpi: dict = field(default_factory=dict)


# ============================================================================
class Replanner:
    def __init__(self, engine: Engine, base: ScheduleResult):
        self.engine = engine
        self.base = base

    # ------------------------------------------------------------------
    def run(self, events: list, now: datetime) -> ReplanReport:
        report = ReplanReport(events=events, now=now,
                              baseline_kpi=dict(self.base.kpi))
        # 方案 A：最少扰动
        ra = ReplanOption('A', '方案 A · 最少扰动', 'conservative')
        ra.result = self._apply(events, now, aggressive=False, opt=ra)
        # 方案 B：最少延期
        rb = ReplanOption('B', '方案 B · 最少延期', 'aggressive')
        rb.result = self._apply(events, now, aggressive=True, opt=rb)
        report.options = [ra, rb]

        # 推荐口径：先比新增超期单数（违约损失代理），再比扰动单数
        def score(o: ReplanOption):
            newly_late = o.impact.get('newly_late', 0)
            moved = o.impact.get('moved_orders', 0)
            late_hours = o.impact.get('late_hours_total', 0)
            return (newly_late, late_hours, moved)

        sa, sb = score(ra), score(rb)
        pick = ra if sa <= sb else rb
        report.recommendation = {
            'option': pick.option_id,
            'reason': (f'方案 {pick.option_id}：新增超期 {pick.impact.get("newly_late", 0)} 单'
                       f'（{pick.impact.get("late_hours_total", 0):.0f}h），扰动 {pick.impact.get("moved_orders", 0)} 单；'
                       f'对方案 {"B" if pick is ra else "A"} 为新增超期 {score(rb if pick is ra else ra)[0]} 单'
                       f'（{score(rb if pick is ra else ra)[1]:.0f}h），扰动 {score(rb if pick is ra else ra)[2]} 单'),
        }
        return report

    # ------------------------------------------------------------------
    def _apply(self, events: list, now: datetime, aggressive: bool,
               opt: ReplanOption) -> ScheduleResult:
        res = copy.deepcopy(self.base)
        # 任务索引
        for ev in events:
            if isinstance(ev, RushOrderEvent):
                self._rush(res, ev, now, aggressive, opt)
            elif isinstance(ev, DowntimeEvent):
                self._downtime(res, ev, now, aggressive, opt)
            elif isinstance(ev, MaterialDelayEvent):
                self._material(res, ev, now, aggressive, opt)
        # KPI 重算（active 订单集合 = 原单 + 插单）
        active = [o for o in self.engine.orders if not o.done and o.spec is not None
                  and o.qty_m > 0 and not o.flags and o.oid in res.order_status]
        active.extend(o for o in opt.inserted_orders if o.oid in res.order_status)
        self.engine._finalize(res, active)
        opt.kpi = dict(res.kpi)
        opt.impact = self._impact(self.base, res, now, opt)
        return res

    # ------------------------------------------------------------------
    def _resolve_oid(self, res: ScheduleResult, oid: str) -> str | None:
        if oid in res.order_status:
            return oid
        # 短号反查
        for t in res.tasks:
            if t.order_key == oid:
                return t.order_id
        return None

    def _rush(self, res: ScheduleResult, ev: RushOrderEvent, now: datetime,
              aggressive: bool, opt: ReplanOption):
        spec = parse_spec(ev.spec_raw)
        if spec is None:
            opt.applicable = False
            opt.notes.append(f'插单规格无法解析：{ev.spec_raw} → 转人工确认')
            res.manual.append({'order_id': ev.oid, 'order_key': ev.oid, 'spec_raw': ev.spec_raw,
                               'stage': '—', 'reason': '插单规格无法解析'})
            return
        o = Order(oid=ev.oid, name=ev.name, spec_raw=ev.spec_raw, spec=spec,
                  qty_m=ev.qty_m, qty_kg=ev.qty_kg, delivery=ev.due,
                  done=False, backlog=False, tier=ev.tier, short_id=ev.oid)
        opt.inserted_orders.append(o)
        m = self.engine.match(o)
        if not m.rope_rows or not m.strand_rows or not m.wire_devs:
            opt.applicable = False
            opt.notes.append(f'插单 {ev.oid} 无可用产能（规格桥接失败）→ 转人工确认')
            res.manual.append({'order_id': ev.oid, 'order_key': ev.oid, 'spec_raw': ev.spec_raw,
                               'stage': '桥接', 'reason': '；'.join(m.reasons)})
            return

        if aggressive:
            # 选项 B：撤下挡道的未开工任务（各候选机上 now 之后、插单链所需窗口内的块）
            self._evict_window(res, o, m, now, ev, opt)

        # 插单作为 tier0 走正常排产（JIT 贴交期，失败 fallback ASAP）
        before_tasks = len(res.tasks)
        self.engine._schedule_order(o, res, now=now)
        placed = [t for t in res.tasks if t.order_id == ev.oid]
        if len(res.tasks) == before_tasks or not placed:
            opt.applicable = False
            opt.notes.append(f'插单 {ev.oid} 未能落位 → 转人工确认')
            return
        close = max((t.end for t in placed if t.process == '合绳'), default=None)
        margin = (ev.due - close).total_seconds() / 3600 if close else None
        opt.changes.append({'order_id': ev.oid, 'process': '全部', 'kind': 'insert',
                            'reason': f'紧急插单落位 {len(placed)} 批次，'
                                      f'交期余量 {"%.1fh" % margin if margin is not None else "—"}'})
        opt.notes.append(f'插单 {ev.oid}：{len(placed)} 个批次，'
                         f'{'准时' if margin is not None and margin >= 0 else f'超期 {-margin:.0f}h' if margin is not None else "无合绳"}')

    def _evict_window(self, res: ScheduleResult, o: Order, m, now: datetime,
                      ev: RushOrderEvent, opt: ReplanOption):
        """选项 B 前置：撤下「挡住插单交期窗口」的未开工任务并整单 ASAP 重排。

        克制原则：每台候选机每工段只撤第一块挡道任务，全局限 6 张订单让路。
        """
        cand_devs = sorted({d for d, _, _ in m.strand_rows[:C.PARALLEL_MAX]} |
                           {d for d, kg, *_ in m.wire_devs[:C.PARALLEL_MAX]})
        evicted_oids: list[str] = []
        seen_oids: set[str] = set()
        for code in cand_devs:
            if len(evicted_oids) >= 6:
                break
            tl = res.timelines.get(code)
            if tl is None:
                continue
            for b in list(tl.blocks):
                if b.kind != 'task' or b.task is None:
                    continue
                if b.task.start < now or b.task.start >= ev.due:
                    continue                      # 只撤插单窗口内的挡道任务
                if b.task.order_id in seen_oids or b.task.order_id == ev.oid:
                    continue
                seen_oids.add(b.task.order_id)
                evicted_oids.append(b.task.order_id)
                break                             # 每台机只取第一块挡道
        # 整单撤下重排（该单未开工的全部批次）
        for oid in evicted_oids:
            src = next((x for x in self.engine.orders if x.oid == oid), None)
            if src is None:
                continue
            removed = 0
            for t in list(res.tasks):
                if t.order_id == oid and t.start >= now:
                    tl = res.timelines.get(t.device)
                    if tl:
                        tl.remove_task(t)
                        for cb in list(tl.blocks):
                            if cb.kind == 'changeover' and cb.order_id == oid and cb.end == t.start:
                                tl.blocks.remove(cb)
                    res.tasks.remove(t)
                    removed += 1
            self.engine._schedule_order(src, res, now=now)
            moved = sum(1 for t in res.tasks if t.order_id == oid)
            opt.changes.append({'order_id': src.short_id, 'process': '全部', 'kind': 'evict',
                                'reason': f'为插单 {ev.oid} 让路：撤下 {removed} 个批次并 ASAP 重排'
                                          f'（重排后 {moved} 个批次）'})
            opt.notes.append(f'{src.short_id} 为插单让路，重排后 {moved} 批次')

    # ------------------------------------------------------------------
    def _downtime(self, res: ScheduleResult, ev: DowntimeEvent, now: datetime,
                  aggressive: bool, opt: ReplanOption):
        tl = res.timelines.get(ev.device)
        if tl is None:
            opt.notes.append(f'⚠ 停机事件：设备 {ev.device} 不在台账中，事件忽略')
            return
        t0, t1 = ev.start, ev.end
        if t1 <= t0:
            opt.notes.append('⚠ 停机时段无效（结束 ≤ 开始），事件忽略')
            return
        dur_h = (t1 - t0).total_seconds() / 3600
        reason = f'{ev.device} {ev.reason} {dur_h:.0f}h（{t0:%m-%d %H:%M}→{t1:%m-%d %H:%M}）'
        affected = []
        for b in list(tl.blocks):
            if b.kind != 'task' or b.task is None:
                continue
            if b.start < t1 and b.end > t0 and b.task.start >= now:
                affected.append((b, b.task))
        if not affected:
            tl.add(Block(t0, t1, 'downtime', 'DOWNTIME', None, ''))
            opt.notes.append(f'{reason}：窗口内无未开工任务，仅登记停机占位')
            return
        # 撤下受影响批次（A/B 都要撤，差别在后续处理）
        for b, task in affected:
            tl.blocks.remove(b)
            for cb in list(tl.blocks):
                if cb.kind == 'changeover' and cb.order_id == task.order_id and cb.end == task.start:
                    tl.blocks.remove(cb)
            res.tasks.remove(task)
        tl.add(Block(t0, t1, 'downtime', 'DOWNTIME', None, ''))
        # 受影响订单按单重排（该单未开工的全部批次重放）
        oids = list({task.order_id for _, task in affected})
        for oid in oids:
            src = next((x for x in self.engine.orders if x.oid == oid), None)
            if src is None:
                continue
            for t in list(res.tasks):
                if t.order_id == oid and t.start >= now:
                    btl = res.timelines.get(t.device)
                    if btl:
                        btl.remove_task(t)
                        for cb in list(btl.blocks):
                            if cb.kind == 'changeover' and cb.order_id == oid and cb.end == t.start:
                                btl.blocks.remove(cb)
                    res.tasks.remove(t)
            self.engine._schedule_order(src, res, now=now)
            new_tasks = [t for t in res.tasks if t.order_id == oid]
            delta = [(t.process, t.device, f'{t.start:%m-%d %H:%M}') for t in new_tasks]
            opt.changes.append({'order_id': src.short_id, 'process': '全部', 'kind': 'downtime',
                                'reason': f'{reason}：该单 {len(affected)} 批次撤下重排'
                                          f'（重排后 {len(new_tasks)} 批次，最早 {min((t.start for t in new_tasks), default=now):%m-%d %H:%M}）'})
        opt.notes.append(f'{reason}：{len(affected)} 个批次受影响，已重排 {len(oids)} 张订单')

    # ------------------------------------------------------------------
    def _material(self, res: ScheduleResult, ev: MaterialDelayEvent, now: datetime,
                  aggressive: bool, opt: ReplanOption):
        oid = self._resolve_oid(res, ev.oid)
        if oid is None:
            opt.notes.append(f'⚠ 物料延迟：订单 {ev.oid} 未找到（可能未排入计划）')
            return
        src = next((x for x in self.engine.orders if x.oid == oid), None)
        if src is None:
            return
        # 撤下该单全部未开工任务，从物料可用时刻起重排
        removed = 0
        for t in list(res.tasks):
            if t.order_id == oid and t.start >= now:
                tl = res.timelines.get(t.device)
                if tl:
                    tl.remove_task(t)
                    for cb in list(tl.blocks):
                        if cb.kind == 'changeover' and cb.order_id == oid and cb.end == t.start:
                            tl.blocks.remove(cb)
                res.tasks.remove(t)
                removed += 1
        self.engine._schedule_order(src, res, now=max(now, ev.new_start))
        new_tasks = [t for t in res.tasks if t.order_id == oid]
        old_close = max((t.end for t in self.base.tasks if t.order_id == oid and t.process == '合绳'),
                        default=None)
        new_close = max((t.end for t in new_tasks if t.process == '合绳'), default=None)
        shift_h = ((new_close - old_close).total_seconds() / 3600) if old_close and new_close else 0
        opt.changes.append({'order_id': src.short_id, 'process': '全部', 'kind': 'material',
                            'reason': f'{ev.reason}：{removed} 个批次顺延至 {ev.new_start:%m-%d %H:%M} 后重排，'
                                      f'合绳链尾{"+%0.0fh" % shift_h if shift_h >= 0 else shift_h}'})
        opt.notes.append(f'{src.short_id} 物料延迟重排：链尾移动 {shift_h:+.0f}h')

    # ------------------------------------------------------------------
    def _impact(self, base: ScheduleResult, new: ScheduleResult, now: datetime,
                opt: ReplanOption) -> dict:
        """对比基线：扰动单数、新增超期单、超期小时总量、插单是否准时。"""
        def close_map(r: ScheduleResult):
            out = {}
            for t in r.tasks:
                if t.process == '合绳':
                    out[t.order_id] = max(out.get(t.order_id, t.end), t.end)
            return out

        base_close, new_close = close_map(base), close_map(new)
        # 冻结任务（start<now）一致性检查
        frozen_moved = 0
        base_idx = {(t.order_id, t.process, t.batch): t for t in base.tasks if t.start < now}
        for k, t in base_idx.items():
            nt = next((x for x in new.tasks if (x.order_id, x.process, x.batch) == k), None)
            if nt is None or nt.start != t.start or nt.device != t.device:
                frozen_moved += 1

        moved_orders = set()
        for oid, e in new_close.items():
            b = base_close.get(oid)
            if b and abs((e - b).total_seconds() / 3600) > 0.5:
                moved_orders.add(oid)
        for c in opt.changes:
            moved_orders.add(c['order_id'])
        moved_orders.discard('INSERT-001')

        base_status = {oid: st for oid, st in base.order_status.items()}
        newly_late = 0
        late_hours = 0.0
        late_list = []
        for oid, st in new.order_status.items():
            if st.get('status') == 'exception':
                old = base_status.get(oid, {})
                was = old.get('status')
                if was in (None, 'scheduled', 'backlog'):
                    newly_late += 1
                    late_hours += abs(st.get('margin_h') or 0)
                    late_list.append({'order_id': oid, 'late_days': st.get('late_days'),
                                      'delay_cause': st.get('delay_cause', ''),
                                      'is_rush': oid.startswith('INSERT')})
        newly_late -= sum(1 for x in late_list if x['is_rush'])
        late_hours = sum(abs(st.get('margin_h') or 0) for oid, st in new.order_status.items()
                         if st.get('status') == 'exception'
                         and base_status.get(oid, {}).get('status') in (None, 'scheduled', 'backlog')
                         and not oid.startswith('INSERT'))
        return {'moved_orders': len(moved_orders), 'newly_late': max(0, newly_late),
                'late_hours_total': late_hours, 'frozen_moved': frozen_moved,
                'newly_late_list': late_list[:10],
                'notes': opt.notes[:12]}
