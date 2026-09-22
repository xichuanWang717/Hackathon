"""按当前可执行排程与空车间理论最早完工对订单进行行动分类。"""
from __future__ import annotations

from datetime import datetime, timedelta


def classify_order(order, min_chain_hours: float | None, status: dict,
                   anchor: datetime) -> str:
    if order.done:
        return '已完成'
    if order.flags or min_chain_hours is None or order.delivery is None:
        return '数据待补'
    if status.get('status') == 'scheduled' and status.get('margin_h', -1) >= 0:
        return '已准时保护'
    isolated_finish = anchor + timedelta(hours=min_chain_hours)
    if isolated_finish <= order.delivery:
        return '可抢救'
    return '物理上暂不可准时'
