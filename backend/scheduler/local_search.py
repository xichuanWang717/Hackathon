"""有界白箱局部搜索：仅接受目标元组严格改善且不移动冻结任务的候选。"""
from dataclasses import dataclass, field

from scheduler.objective import evaluate_objective, is_strict_improvement


@dataclass(frozen=True)
class SearchLimits:
    max_orders: int = 20
    max_depth: int = 2


@dataclass
class SearchReport:
    result: object
    objective_before: object
    objective_after: object
    accepted_swaps: list = field(default_factory=list)
    rejected_attempts: list = field(default_factory=list)
    frozen_task_changes: list = field(default_factory=list)


def _imbalance(result) -> float:
    values = list((getattr(result, 'device_util', None) or {}).values())
    return (max(values) - min(values)) if values else 0.0


def _objective(orders, result):
    return evaluate_objective(
        orders, result.order_status, result.tasks,
        getattr(result, 'changeover_hours', 0), _imbalance(result),
    ).vector


def _frozen_signature(result, now):
    if now is None:
        return ()
    rows = []
    for task in result.tasks:
        if task.start < now:
            rows.append((task.order_id, getattr(task, 'process', ''), task.batch,
                         task.device, task.start, task.end))
    return tuple(sorted(rows))


def improve_schedule(engine, result, orders, limits: SearchLimits,
                     anchor, horizon_end, now=None) -> SearchReport:
    scoped_orders = [o for o in orders if o.delivery is not None
                     and anchor <= o.delivery <= horizon_end]
    original_objective = _objective(scoped_orders, result)
    best_result = result
    best_objective = original_objective
    accepted = []
    rejected = []
    frozen_changes = []
    promoted = []
    for _depth in range(limits.max_depth):
        manual = [o for o in scoped_orders
                  if best_result.order_status.get(o.oid, {}).get('status', 'manual') == 'manual']
        improved_this_depth = False
        for order in sorted(manual, key=lambda o: (o.delivery, o.oid))[:limits.max_orders]:
            overrides = {oid: index - len(promoted) - 1 for index, oid in enumerate(promoted)}
            overrides[order.oid] = -len(promoted) - 1
            engine.order_rank_overrides = overrides
            candidate = engine.run(orders)
            if not (getattr(candidate, 'validation', None) or {}).get('valid', False):
                rejected.append({'order_id': order.oid, 'reason': 'validation_failed'})
                continue
            if _frozen_signature(candidate, now) != _frozen_signature(best_result, now):
                rejected.append({'order_id': order.oid, 'reason': 'frozen_task_changed'})
                frozen_changes.append(order.oid)
                continue
            candidate_objective = _objective(scoped_orders, candidate)
            if is_strict_improvement(best_objective, candidate_objective):
                best_result = candidate
                best_objective = candidate_objective
                promoted.append(order.oid)
                accepted.append(order.oid)
                improved_this_depth = True
                break
            rejected.append({'order_id': order.oid, 'reason': 'objective_not_improved'})
        if not improved_this_depth:
            break
    engine.order_rank_overrides = {}
    return SearchReport(best_result, original_objective, best_objective,
                        accepted, rejected, frozen_changes)
