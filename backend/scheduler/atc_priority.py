"""ATC优先指数：同时权衡交期紧迫度与单位工时救单收益。"""
from __future__ import annotations

import math


def atc_priority_key(order, process_hours: float, anchor,
                     average_hours: float, k: float):
    if order.delivery is None or process_hours <= 0 or not math.isfinite(process_hours):
        return (float('inf'), order.oid)
    available = (order.delivery - anchor).total_seconds() / 3600.0
    slack = max(0.0, available - process_hours)
    scale = max(1e-9, float(k) * float(average_hours))
    index = math.exp(-slack / scale) / process_hours
    return (-index, order.delivery, process_hours, order.oid)
