"""白箱字典序目标；各目标按业务优先级比较，不压缩成加权总分。"""
from dataclasses import dataclass


@dataclass(frozen=True, order=True)
class ObjectiveVector:
    infeasible_p0: int
    hard_violations: int
    uncommitted_orders: int
    late_orders: int
    commitment_violations: int
    penalty_value: float
    late_hours: float
    negative_completed_orders: int
    changeover_hours: float
    load_imbalance: float


@dataclass(frozen=True)
class ObjectiveEvaluation:
    vector: ObjectiveVector
    penalty_value: float
    penalty_source: str


def is_strict_improvement(before: ObjectiveVector, after: ObjectiveVector) -> bool:
    return after < before


def evaluate_objective(orders, order_status, tasks, changeover_hours: float,
                       load_imbalance: float, penalty_by_order=None) -> ObjectiveEvaluation:
    penalty_by_order = penalty_by_order or {}
    infeasible_p0 = 0
    hard_violations = 0
    uncommitted = 0
    late_orders = 0
    commitment_violations = 0
    late_hours = 0.0
    completed = 0
    configured_penalty = 0.0
    has_configured_penalty = False
    for order in orders:
        status = order_status.get(order.oid, {})
        state = status.get('status', 'manual')
        if order.tier == 0 and state not in {'scheduled', 'exception'}:
            infeasible_p0 += 1
        if state not in {'scheduled', 'exception'}:
            uncommitted += 1
        if state in {'scheduled', 'exception'}:
            completed += 1
        hours = max(0.0, -float(status.get('margin_h', 0) or 0))
        if hours > 0:
            late_orders += 1
        tolerance = float(getattr(order, 'delay_tolerance_hours', 0) or 0)
        if hours > tolerance:
            commitment_violations += 1
        late_hours += hours
        if order.oid in penalty_by_order:
            has_configured_penalty = True
            configured_penalty += float(penalty_by_order[order.oid]) * hours
    penalty_value = configured_penalty if has_configured_penalty else late_hours
    vector = ObjectiveVector(
        infeasible_p0, hard_violations, uncommitted, late_orders,
        commitment_violations, penalty_value, late_hours, -completed,
        float(changeover_hours), float(load_imbalance),
    )
    return ObjectiveEvaluation(
        vector=vector,
        penalty_value=penalty_value,
        penalty_source='enterprise' if has_configured_penalty else 'proxy_late_hours',
    )
