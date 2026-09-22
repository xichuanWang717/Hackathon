"""订单动态紧急度：用承诺截止与最短剩余工艺时间计算松弛度。"""
from __future__ import annotations

from datetime import datetime, timedelta

from scheduler import config as C
from scheduler.bridge import wire_hours_from_meters, wire_requirement_m


def estimate_min_chain_hours(order, matched) -> float | None:
    """按各工序最快适配设备估算完整三工序链的理论最短小时数。"""
    if not matched.rope_rows or not matched.strand_rows or not matched.wire_devs:
        return None
    rope_rate = max(float(row[1]) for row in matched.rope_rows) * 60.0
    strand_rate = max(float(row[1]) for row in matched.strand_rows) * 60.0
    wire_speed_mps = max(float(row[1]) for row in matched.wire_devs)
    if min(rope_rate, strand_rate, wire_speed_mps) <= 0:
        return None

    try:
        wire_h = wire_hours_from_meters(
            wire_requirement_m(order.spec, float(order.qty_m)), wire_speed_mps
        )
    except ValueError:
        return None
    strand_h = float(matched.strand_len_m) / strand_rate
    prep_h = float(order.spec.total_strands) * C.ROPE_PREP_MIN_PER_STRAND / 60.0
    rope_h = float(order.qty_m) / rope_rate + prep_h
    handover_h = 2.0 * C.HANDOVER_MIN_H
    return wire_h + strand_h + rope_h + handover_h


def dynamic_urgency_key(order, matched, anchor: datetime):
    """P0优先；其余按承诺交期下的剩余松弛时间从小到大排序。"""
    p0_bucket = 0 if order.tier == 0 else 1
    due = order.delivery or datetime.max
    chain_h = estimate_min_chain_hours(order, matched)
    if chain_h is None or order.delivery is None:
        slack_h = float('inf')
    else:
        commitment_due = due + timedelta(
            hours=float(getattr(order, 'delay_tolerance_hours', 0) or 0)
        )
        available_h = (commitment_due - anchor).total_seconds() / 3600.0
        slack_h = available_h - chain_h
    return (p0_bucket, slack_h, due, -float(order.qty_m))
