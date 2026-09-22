"""交期日内截止时刻的隔离验证工具。"""
from __future__ import annotations

import copy
from datetime import time


def apply_due_cutoff(order, cutoff: time):
    changed = copy.deepcopy(order)
    if changed.delivery is not None:
        changed.delivery = changed.delivery.replace(
            hour=cutoff.hour, minute=cutoff.minute, second=cutoff.second,
            microsecond=0,
        )
    return changed


def apply_cutoff_to_orders(orders, cutoff: time):
    return [apply_due_cutoff(order, cutoff) for order in orders]
