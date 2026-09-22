# -*- coding: utf-8 -*-
"""批次化多目标启发式排产引擎（V0.3 重写版）。

分层字典序目标：违约损失 → 严格准时率 → 容忍窗履约 → 利用率均衡 → 稳定性。
刻意不用黑盒优化器（评审硬性项）；每条排程带 constraint_trace 指回 R1–R10。
"""
from __future__ import annotations

import bisect
import copy
import math
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from scheduler import config as C
from scheduler.bridge import CapacityIndex, Spec, match_order, wire_hours_from_meters, wire_requirement_m
from scheduler.dataloader import Order
from scheduler.policies import classify_priority
from scheduler.batching import ordered_batch_candidates
from scheduler.classification_priority import classification_priority_key


def valid_handover(upstream_end: datetime, downstream_start: datetime) -> bool:
    """R6：相邻工序交接必须落在闭区间 [2h, 72h]。"""
    gap_hours = (downstream_start - upstream_end).total_seconds() / 3600
    return C.HANDOVER_MIN_H <= gap_hours <= C.HANDOVER_MAX_H


@dataclass
class Trace:
    rule: str
    text: str
    impact: str = ''


@dataclass
class Task:
    order_id: str
    order_key: str             # 前端展示短号
    process: str
    device: str
    batch: int
    start: datetime
    end: datetime
    trace: list = field(default_factory=list)


@dataclass
class Block:
    start: datetime
    end: datetime
    kind: str                  # task / changeover / downtime / prep
    order_id: str = ''
    task: Task | None = None
    ckey: str = ''             # 换型键（task 块携带）


def changeover_hours(prev_key: str | None, new_key: str) -> float:
    """换型时长：同键 0；任何实际换型固定 1h（R3）。"""
    if prev_key is None or prev_key == new_key:
        return 0.0
    return C.CHANGEOVER_H


class Timeline:
    """单机时间线：按 start 排序的块列表。"""

    def __init__(self, code: str, key: str = '', horizon_end: datetime | None = None):
        self.code = code
        self.key = key            # 末端换型键（最后一次加工的状态）
        self.horizon_end = horizon_end
        self.blocks: list[Block] = []

    # ------------------------------------------------------------------
    def _busy(self, s: datetime, e: datetime) -> bool:
        for b in self.blocks:
            if s < b.end and b.start < e:
                return True
        return False

    def _prev_key(self, at: datetime) -> str | None:
        """at 时刻之前最后一个任务块的换型键。"""
        prev = None
        for b in self.blocks:
            if b.start >= at:
                break
            if b.kind == 'task' and b.ckey:
                prev = b.ckey
        return prev

    def place(self, dur_h: float, earliest: datetime, latest_end: datetime | None,
              key: str, mode: str = 'asap'):
        """试放一个任务块（换型串行在前，计入占用）。

        mode='asap' 最早可排；'jit' 尽量贴 latest_end（在制品最小）。
        返回 (block_start, task_end, changeover_h, task_start)；放不下返回 None。
        """
        dur = timedelta(hours=dur_h)
        if mode == 'asap':
            t = earliest
            # 顺序扫描：从 earliest 起找第一个能容纳 换型+任务 的空隙
            cands = [t] + [b.end for b in self.blocks if b.end > t]
            for gs in sorted(set(cands)):
                if gs < t:
                    continue
                co = changeover_hours(self._prev_key(gs), key)
                s = gs + timedelta(hours=co)
                e = s + dur
                if self.horizon_end is not None and e > self.horizon_end:
                    continue
                if not self._busy(gs, e) and (latest_end is None or e <= latest_end):
                    return (gs, e, co, s)
                if latest_end is not None and e > latest_end:
                    return None
            return None
        # ---- JIT：从 latest_end 往回找最晚可行位置 ----
        cands = set()
        if latest_end is not None:
            cands.add(latest_end)
        for b in self.blocks:
            if b.start <= latest_end:
                cands.add(b.start)
        for e in sorted(cands, reverse=True):
            if self.horizon_end is not None and e > self.horizon_end:
                continue
            s = e - dur
            if s < earliest:
                continue
            co = changeover_hours(self._prev_key(s), key)
            bs = s - timedelta(hours=co)
            if bs >= earliest and not self._busy(bs, e):
                return (bs, e, co, s)
        return None

    def add(self, block: Block):
        bisect.insort(self.blocks, block, key=lambda b: (b.start, b.end))
        if block.ckey and block.kind == 'task':
            self.key = block.ckey

    def remove_task(self, task: Task) -> bool:
        before = len(self.blocks)
        self.blocks = [b for b in self.blocks if b.task is not task]
        return len(self.blocks) < before

    def busy_hours(self, t0: datetime, t1: datetime) -> float:
        total = 0.0
        for b in self.blocks:
            s, e = max(b.start, t0), min(b.end, t1)
            if s < e:
                total += (e - s).total_seconds() / 3600.0
        return total


# ============================================================================
# 结果容器
# ============================================================================
@dataclass
class ScheduleResult:
    tasks: list = field(default_factory=list)
    timelines: dict = field(default_factory=dict)      # device → Timeline
    manual: list = field(default_factory=list)         # 人工确认队列
    exceptions: list = field(default_factory=list)     # 异常决策队列（超期）
    done_orders: list = field(default_factory=list)
    backlog_orders: list = field(default_factory=list)
    order_status: dict = field(default_factory=dict)   # oid → dict(status, margin_h, late_days, ...)
    kpi: dict = field(default_factory=dict)
    util_by_process: dict = field(default_factory=dict)
    device_util: dict = field(default_factory=dict)
    changeover_count: int = 0
    changeover_hours: float = 0.0
    baseline: datetime = C.BASELINE
    horizon_days: int = C.WINDOW_DAYS
    planning_end: datetime | None = None
    feasibility: str = 'unchecked'
    validation: dict = field(default_factory=dict)


class Engine:
    def __init__(self, orders: list[Order], idx: CapacityIndex | None = None,
                 run_config: C.ScheduleConfig | None = None,
                 adaptive_batching: bool = True,
                 max_batch_attempts: int = 3,
                 device_policy: str = 'balanced'):
        self.orders = orders
        self.idx = idx or CapacityIndex()
        self.run_config = run_config or C.ScheduleConfig()
        self.adaptive_batching = adaptive_batching
        self.max_batch_attempts = max(1, int(max_batch_attempts))
        if device_policy not in {'balanced', 'fastest', 'least_loaded'}:
            raise ValueError('未知设备分配策略')
        self.device_policy = device_policy
        self._match_cache: dict[str, object] = {}
        self.order_rank_overrides: dict[str, int] = {}
        self.order_classifications: dict[str, str] = {}

    # ------------------------------------------------------------------
    def match(self, o: Order):
        key = f'{o.spec_raw}|{o.qty_m}|{o.qty_kg}'
        if key not in self._match_cache:
            self._match_cache[key] = match_order(o.spec, o.qty_kg, o.qty_m, self.idx)
        return self._match_cache[key]

    # ------------------------------------------------------------------
    def run(self, orders: list[Order] | None = None) -> ScheduleResult:
        orders = orders if orders is not None else self.orders
        res = ScheduleResult()
        window_end = self.run_config.horizon_end
        res.baseline = self.run_config.schedule_anchor
        res.horizon_days = self.run_config.horizon_days
        res.timelines = {code: Timeline(code, horizon_end=self.run_config.planning_end)
                         for code in list(self.idx.wire) + self.idx.strand_devs + self.idx.rope_devs}

        # ---- 订单分桶（R9 分层 + EDD）--------------------------------------
        active = [o for o in orders if not o.done and o.spec is not None
                  and o.qty_m > 0 and not o.flags]
        for o in orders:
            if o.done:
                res.done_orders.append(o)
            elif o.flags:
                res.manual.append({'order_id': o.oid, 'order_key': o.short_id, 'spec_raw': o.spec_raw,
                                   'stage': '—', 'reason': '；'.join(o.flags) or '数据不完整'})
            elif o.backlog:
                res.backlog_orders.append(o)

        def sort_key(o: Order):
            rank_override = self.order_rank_overrides.get(o.oid, 0)
            if self.order_classifications:
                return classification_priority_key(
                    o, self.order_classifications.get(o.oid, '数据待补'), rank_override
                )
            priority = classify_priority(o.tier == 0, o.delivery, o.delay_policy,
                                         self.run_config.schedule_anchor,
                                         self.run_config.near_due_hours)
            return (priority, rank_override, o.delivery or window_end, -o.qty_m)

        deferred: list[Order] = []
        for o in sorted(active, key=sort_key):
            if o.backlog:
                deferred.append(o)
                continue
            self._schedule_order(o, res, now=self.run_config.schedule_anchor)

        # 积压单：历史欠账，窗口内 ASAP 补排，不占准时分母
        for o in sorted(deferred, key=sort_key):
            self._schedule_order(o, res, now=self.run_config.schedule_anchor, backlog=True)

        self._finalize(res, active)
        return res

    # ------------------------------------------------------------------
    def _schedule_order(self, o: Order, res: ScheduleResult, now: datetime,
                        backlog: bool = False):
        """在隔离副本上尝试有限批次数；只提交完整成链的最佳候选。"""
        try:
            wire_requirement_m(o.spec, o.qty_m)
        except ValueError as exc:
            res.manual.append({'order_id': o.oid, 'order_key': o.short_id, 'spec_raw': o.spec_raw,
                               'stage': '拉丝', 'reason': str(exc)})
            res.order_status[o.oid] = {'status': 'manual', 'reason': '规格结构待人工确认'}
            return
        if not self.adaptive_batching:
            return self._schedule_order_once(o, res, now, backlog)
        m = self.match(o)
        if not m.rope_rows or not m.strand_rows or not m.wire_devs:
            return self._schedule_order_once(o, res, now, backlog)

        def best_hours(rows, length, wire_speed=False):
            rates = sorted((v for _, v, *_ in rows), reverse=True)
            rate = rates[0] * (3600.0 if wire_speed else 60.0)
            return length / max(0.5, rate)

        wire_m_total = wire_requirement_m(o.spec, o.qty_m)
        estimated = max(
            best_hours(m.rope_rows, o.qty_m),
            best_hours(m.strand_rows, m.strand_len_m),
            best_hours(m.wire_devs, wire_m_total, wire_speed=True),
        )
        candidates = ordered_batch_candidates(o, estimated)[:self.max_batch_attempts]
        attempts = []
        best = None
        best_key = None
        fallback = None
        for count in candidates:
            trial = copy.deepcopy(res)
            self._schedule_order_once(o, trial, now, backlog, forced_batches=count)
            state = trial.order_status.get(o.oid, {}).get('status', 'manual')
            completed = state in {'scheduled', 'exception'}
            attempts.append({'batch_count': count, 'completed': completed, 'status': state})
            if fallback is None:
                fallback = trial
            if not completed:
                continue
            margin = trial.order_status[o.oid].get('margin_h', float('-inf'))
            changeover_delta = trial.changeover_hours - res.changeover_hours
            key = (0 if state == 'scheduled' else 1, max(0.0, -margin), changeover_delta, count)
            if best_key is None or key < best_key:
                best_key, best = key, trial
            if state == 'scheduled':
                break
        chosen = best or fallback
        if chosen is not None:
            res.__dict__.update(copy.deepcopy(chosen.__dict__))
        res.order_status.setdefault(o.oid, {})['batch_attempts'] = attempts

    def _schedule_order_once(self, o: Order, res: ScheduleResult, now: datetime,
                             backlog: bool = False, forced_batches: int | None = None):
        m = self.match(o)
        if not m.rope_rows or not m.strand_rows or not m.wire_devs:
            stage = next((p for p, rows in (('拉丝', m.wire_devs), ('捻股', m.strand_rows),
                                            ('合绳', m.rope_rows)) if not rows), '—')
            res.manual.append({'order_id': o.oid, 'order_key': o.short_id, 'spec_raw': o.spec_raw,
                               'stage': stage,
                               'reason': f'{stage}工序无可用产能：' + '；'.join(m.reasons)})
            res.order_status[o.oid] = {'status': 'manual', 'reason': f'{stage} 无可用产能'}
            return

        due = o.delivery or self.run_config.horizon_end
        # ---- 批次规模估算（按最快可用机估最短总工时，决定拆批数）-----------
        def best_hours(rows, length, wire_speed=False):
            rates = sorted((v for _, v, *_ in rows), reverse=True)
            v = rates[0] * (3600.0 if wire_speed else 60.0)
            return length / max(0.5, v)

        rope_h_min = best_hours(m.rope_rows, o.qty_m)
        strand_h_min = best_hours(m.strand_rows, m.strand_len_m)
        wire_m_total = wire_requirement_m(o.spec, o.qty_m)
        wire_h_min = best_hours(m.wire_devs, wire_m_total, wire_speed=True)

        n_batches = forced_batches or min(
            C.BATCH_MAX,
            max(1, math.ceil(max(rope_h_min, strand_h_min, wire_h_min) / C.BATCH_TARGET_H)),
        )
        per_m = o.qty_m / n_batches
        per_len = m.strand_len_m / n_batches
        per_wire_m = wire_m_total / n_batches

        # 每台候选机按自身速率的批次工时（选机/放置以真实工时进行）
        prep_h = self._prep_h(o)
        rope_devs = [(d, per_m / (v * 60.0) + prep_h) for d, v, _ in m.rope_rows[:C.PARALLEL_MAX]]
        strand_devs = [(d, per_len / (v * 60.0)) for d, v, _ in m.strand_rows[:C.PARALLEL_MAX]]
        wire_devs = [(d, wire_hours_from_meters(per_wire_m, speed))
                     for d, speed, *_ in sorted(m.wire_devs, key=lambda x: -x[1])[:C.PARALLEL_MAX]]

        rope_key = f"rope|{o.spec.dia:g}|{o.spec.strands:g}*{o.spec.strand_struct}+{o.spec.core}"
        strand_key = f"strand|{m.strand_dia:.2f}"
        wire_key = f"wire|{m.wire_dia:.2f}"

        # trace：公共部分只挂第一批，其余任务只挂工序级解释（导出干净）
        common = [Trace('R1', f'设备适配：{o.spec.raw} → 捻股 {len(strand_devs)} 台 / 合绳 {len(rope_devs)} 台'
                                        f'（{"直接命中" if not m.inferred else "含推断，标黄"}）', '')]
        common += [Trace('DATA', r, '') for r in m.reasons]
        if m.inferred:
            common.append(Trace('R1', '工艺参数为结构学推断（标黄），需企业确认后方可作为正式排程依据',
                                'inferred'))

        def commit(tl, co_h, s, e, ckey, task):
            """落块：换型块 + 任务块（试放通过后调用）。"""
            if co_h > 0:
                tl.add(Block(s - timedelta(hours=co_h), s, 'changeover', o.oid, None, ''))
                res.changeover_count += 1
                res.changeover_hours += co_h
            tl.add(Block(s, e, 'task', o.oid, task, ckey))
            res.tasks.append(task)

        placed_any = False
        completed_batches = 0
        rope_anchor = due
        for b in range(n_batches):
            tc = common if b == 0 else []

            # ---- 合绳：JIT 贴交期（积压单 ASAP）----
            latest_end = min(rope_anchor, due) if not backlog else None
            rope = self._place_batch(res, rope_devs, rope_key, now, latest_end,
                                     'asap' if backlog else 'jit')
            if rope is None and latest_end is not None:
                rope = self._place_batch(res, rope_devs, rope_key, now, None, 'asap')
            if rope is None:
                break
            rope_tl, rope_co, rope_s, rope_e = rope

            # ---- 捻股：JIT 完工 ≤ 合绳开工 − 2h ----
            strand = self._place_batch(res, strand_devs, strand_key, now,
                                       rope_s - timedelta(hours=C.HANDOVER_MIN_H), 'jit')
            if strand is None:
                strand = self._place_batch(res, strand_devs, strand_key, now, None, 'asap')
            if strand is None:
                break
            strand_tl, strand_co, strand_s, strand_e = strand
            if strand_e + timedelta(hours=C.HANDOVER_MIN_H) > rope_s:
                new_rope = self._place_batch(res, rope_devs, rope_key,
                                             strand_e + timedelta(hours=C.HANDOVER_MIN_H), None, 'asap')
                if new_rope is None:
                    break
                rope_tl, rope_co, rope_s, rope_e = new_rope
                tc.append(Trace('R6', f'捻股完工 {strand_e:%m-%d %H:%M} 晚于合绳原排 → 合绳批次顺延（交接≥2h）', 'shifted'))

            # ---- 拉丝：JIT 完工 ≤ 捻股开工 − 2h；赶不上则捻股/合绳级联顺延 ----
            wire = self._place_batch(res, wire_devs, wire_key, now,
                                     strand_s - timedelta(hours=C.HANDOVER_MIN_H), 'jit')
            if wire is None:
                wire = self._place_batch(res, wire_devs, wire_key, now, None, 'asap')
            if wire is None:
                break
            wire_tl, wire_co, wire_s, wire_e = wire
            if wire_e + timedelta(hours=C.HANDOVER_MIN_H) > strand_s:
                new_strand = self._place_batch(res, strand_devs, strand_key,
                                               wire_e + timedelta(hours=C.HANDOVER_MIN_H), None, 'asap')
                if new_strand is None:
                    break
                strand_tl, strand_co, strand_s, strand_e = new_strand
                tc.append(Trace('R6', f'拉丝完工 {wire_e:%m-%d %H:%M} 晚于捻股原排 → 捻股顺延', 'shifted'))
                if strand_e + timedelta(hours=C.HANDOVER_MIN_H) > rope_s:
                    new_rope = self._place_batch(res, rope_devs, rope_key,
                                                 strand_e + timedelta(hours=C.HANDOVER_MIN_H), None, 'asap')
                    if new_rope is None:
                        break
                    rope_tl, rope_co, rope_s, rope_e = new_rope
                    tc.append(Trace('R6', '捻股顺延后合绳批次同步顺延（交接≥2h）', 'shifted'))

            # ---- 本批三工序落块；R6两段交接均须落在2–72h ----
            wire_gap = (strand_s - wire_e).total_seconds() / 3600
            gap = (rope_s - strand_e).total_seconds() / 3600
            if not (valid_handover(wire_e, strand_s)
                    and valid_handover(strand_e, rope_s)):
                break
            t_wire = Task(o.oid, o.short_id, '拉丝', wire_tl.code, b, wire_s, wire_e, list(tc))
            t_wire.trace.append(Trace('R2', f'拉丝批次 {b+1}/{n_batches}：{(wire_e-wire_s).total_seconds()/3600:.1f}h'
                                            f'（成品 {per_m:,.0f}m × 外层钢丝 {o.spec.outer_wire_count} 根'
                                            f' × 捻缩 {C.LAY_FACTOR:g} = {per_wire_m:,.0f}m ÷ 设备速度 m/s）',
                                        f'{wire_tl.code}'))
            if wire_co > 0:
                t_wire.trace.append(Trace('R3', f'换型 {wire_co:.0f}h（企业固定）', f'+{wire_co:.0f}h'))
            t_strand = Task(o.oid, o.short_id, '捻股', strand_tl.code, b, strand_s, strand_e, list(tc))
            t_strand.trace.append(Trace('R2', f'捻股批次 {b+1}/{n_batches}：{(strand_e-strand_s).total_seconds()/3600:.1f}h'
                                              f'（股长 {per_len:,.0f}m）',
                                        f'{strand_tl.code}'))
            if strand_co > 0:
                t_strand.trace.append(Trace('R3', f'换型 {strand_co:.0f}h（企业固定）', f'+{strand_co:.0f}h'))
            t_strand.trace.append(Trace('R6', f'捻股→合绳交接 {gap:.1f}h（2–72h）', ''))
            t_rope = Task(o.oid, o.short_id, '合绳', rope_tl.code, b, rope_s, rope_e, list(tc))
            t_rope.trace.append(Trace('R2', f'合绳批次 {b+1}/{n_batches}：{(rope_e-rope_s).total_seconds()/3600:.1f}h'
                                           f'（含上股准备 {prep_h:.1f}h）',
                                      f'{rope_tl.code}'))
            if rope_co > 0:
                t_rope.trace.append(Trace('R3', f'换型/上股准备 {rope_co:.0f}h', f'+{rope_co:.0f}h'))

            commit(wire_tl, wire_co, wire_s, wire_e, wire_key, t_wire)
            commit(strand_tl, strand_co, strand_s, strand_e, strand_key, t_strand)
            commit(rope_tl, rope_co, rope_s, rope_e, rope_key, t_rope)
            placed_any = True
            completed_batches += 1
            rope_anchor = rope_s - timedelta(minutes=30)

        if completed_batches != n_batches:
            # 订单级事务回滚：不能把只完成部分批次的订单当作可执行计划。
            for tl in res.timelines.values():
                tl.blocks = [blk for blk in tl.blocks if blk.order_id != o.oid]
            res.tasks = [task for task in res.tasks if task.order_id != o.oid]
            res.changeover_count = sum(1 for tl in res.timelines.values()
                                       for blk in tl.blocks if blk.kind == 'changeover')
            res.changeover_hours = sum((blk.end - blk.start).total_seconds() / 3600
                                       for tl in res.timelines.values()
                                       for blk in tl.blocks if blk.kind == 'changeover')
            res.manual.append({'order_id': o.oid, 'order_key': o.short_id, 'spec_raw': o.spec_raw,
                               'stage': '三工序链',
                               'reason': f'仅完成 {completed_batches}/{n_batches} 批试放，因计划窗口、产能、换型或R6冲突整单回滚'})
            res.order_status[o.oid] = {'status': 'manual', 'reason': '批次无法在窗口内完整成链'}
            return

        # ---- 门禁（R8）：准时 / 超期 --------------------------------------
        rope_tasks = [t for t in res.tasks if t.order_id == o.oid and t.process == '合绳']
        close_end = max(t.end for t in rope_tasks)
        margin_h = (due - close_end).total_seconds() / 3600
        st = {'margin_h': margin_h, 'delivery': due}
        if margin_h >= 0:
            st['status'] = 'scheduled'
            st['late_days'] = 0
        else:
            st['status'] = 'exception'
            st['late_days'] = round(-margin_h / 24, 1)
            st['delay_cause'] = self._delay_cause(res.tasks, o.oid)
            res.exceptions.append({'order_id': o.oid, 'order_key': o.short_id, 'spec_raw': o.spec_raw,
                                   'delivery': due.strftime('%m-%d'), 'close_end': close_end.strftime('%m-%d %H:%M'),
                                   'late_days': st['late_days'], 'delay_cause': st['delay_cause'],
                                   'tier': o.tier})
            rope_tasks[0].trace.append(Trace('R8', f'预计超期 {-margin_h:.0f}h（{st["late_days"]} 天），'
                                                   f'原因：{st["delay_cause"]}', 'late'))
        res.order_status[o.oid] = st

    # ------------------------------------------------------------------
    def _prep_h(self, o: Order) -> float:
        """合绳上股准备 = 上股总数 × 10 分钟（R3；多股结构按总股数）。"""
        return (o.spec.total_strands * C.ROPE_PREP_MIN_PER_STRAND) / 60.0 if o.spec else 0.0

    def _place_batch(self, res, devs, key, earliest, latest_end, mode):
        """多机选机（分层字典序）：最小换型 → 最小负荷 → 最早完工。

        devs = [(code, dur_h)]，dur 已按各机真实速率折算。
        """
        best = None
        for code, dur_h in devs:
            tl = res.timelines.get(code)
            if tl is None:
                continue
            got = tl.place(dur_h, earliest, latest_end, key, mode=mode)
            if not got:
                continue
            bs, e, co, s = got
            load = tl.busy_hours(self.run_config.schedule_anchor, self.run_config.horizon_end)
            # ASAP：最早完工优先（自然倾向快机）；JIT：换型最小 → 负荷均衡
            if self.device_policy == 'fastest':
                cand = (dur_h, e, co, load)
            elif self.device_policy == 'least_loaded':
                cand = (load, co, e, dur_h)
            elif mode == 'asap':
                cand = (e, co, load)
            else:
                cand = (co, load, e)
            if best is None or cand < best[0]:
                best = (cand, tl, co, s, e)
        if best:
            _, tl, co, s, e = best
            return (tl, co, s, e)
        return None

    def _delay_cause(self, tasks: list, oid: str) -> str:
        tasks = [t for t in tasks if t.order_id == oid]
        by_p = {t.process: t for t in tasks}
        if '合绳' in by_p and '捻股' in by_p:
            gap = (by_p['合绳'].start - by_p['捻股'].end).total_seconds() / 3600
            if gap > 24:
                return f'合绳排队（捻股完工后等待 {gap:.0f}h 才上机）'
        return '工序批次排队，产能受限'

    def _finalize(self, res: ScheduleResult, active: list[Order]):
        self._last_tasks = res.tasks
        active_ids = {o.oid for o in active if not o.backlog}
        scheduled_ids = {t.order_id for t in res.tasks}
        on_time = 0
        commitment_met = 0
        eligible = len(active_ids)
        for oid in active_ids:
            st = res.order_status.get(oid)
            if not st:
                continue
            if st.get('status') == 'scheduled':
                on_time += 1
                commitment_met += 1
            elif st.get('margin_h', float('-inf')) >= -next(
                    (o.delay_tolerance_hours for o in active if o.oid == oid), 0):
                commitment_met += 1

        window_h = self.run_config.horizon_hours
        by_proc_total: dict[str, float] = defaultdict(float)
        by_proc_devs: dict[str, int] = defaultdict(int)
        dev_util = {}
        for code, tl in res.timelines.items():
            proc = self._proc_of(code)
            busy = tl.busy_hours(self.run_config.schedule_anchor, self.run_config.horizon_end)
            by_proc_total[proc] += busy
            by_proc_devs[proc] += 1
            dev_util[code] = busy / window_h
        util_by_proc = {p: (by_proc_total[p] / (by_proc_devs[p] * window_h)) if by_proc_devs[p] else 0.0
                        for p in C.PROCESS_ORDER}
        util_all = sum(util_by_proc.values()) / len(util_by_proc)
        congested = sum(1 for v in dev_util.values() if v > C.CONGESTED_RATE)

        res.kpi = {
            'on_time_rate': on_time / eligible if eligible else 0.0,
            'on_time_rate_fresh': on_time / eligible if eligible else 0.0,
            'strict_on_time_rate': on_time / eligible if eligible else 0.0,
            'commitment_met_rate': commitment_met / eligible if eligible else 0.0,
            'eligible_orders': eligible,
            'utilization': util_all,
            'device_total': len(res.timelines),
            'congested': congested,
            'risk_orders': len(res.exceptions),
            'scheduled_rate': len(scheduled_ids & (active_ids | {o.oid for o in res.backlog_orders})) /
                              max(1, len(active_ids) + len(res.backlog_orders)),
        }
        from scheduler.kpi import compute_scoped_kpis
        scoped = compute_scoped_kpis(active, res.order_status,
                                     self.run_config.schedule_anchor,
                                     self.run_config.horizon_end)
        res.kpi.update(scoped)
        res.kpi['on_time_rate'] = scoped['strict_on_time_rate']
        res.kpi['on_time_rate_fresh'] = scoped['strict_on_time_rate']
        res.util_by_process = util_by_proc
        res.device_util = dev_util
        from scheduler.validator import validate_schedule
        commitment_ends = [o.delivery + timedelta(hours=o.delay_tolerance_hours)
                           for o in active if o.delivery is not None]
        task_ends = [task.end for task in res.tasks]
        res.planning_end = max(commitment_ends + task_ends + [self.run_config.horizon_end])
        report = validate_schedule(res.tasks, self.run_config.schedule_anchor,
                                   self.run_config.planning_end)
        res.validation = {
            'valid': report.valid,
            'violations': [vars(item) for item in report.violations],
        }
        res.feasibility = 'feasible' if report.valid else 'infeasible'

    def _proc_of(self, code: str) -> str:
        if code in self.idx.wire:
            return '拉丝'
        if code in self.idx.strand_devs:
            return '捻股'
        return '合绳'
