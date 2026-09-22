"""自适应批次候选与完整事务选择。"""
import math


ALLOWED_BATCH_COUNTS = (1, 2, 3, 4, 6, 8, 12)


def candidate_batch_counts(order, estimated_hours: float) -> tuple[int, ...]:
    if estimated_hours <= 24:
        return (1,)
    if estimated_hours <= 48:
        return (1, 2, 3, 4)
    return ALLOWED_BATCH_COUNTS


def ordered_batch_candidates(order, estimated_hours: float) -> tuple[int, ...]:
    candidates = candidate_batch_counts(order, estimated_hours)
    target = max(1, math.ceil(estimated_hours / 24.0))
    return tuple(sorted(candidates, key=lambda count: (abs(count - target), count)))


def choose_complete_attempt(attempts):
    complete = [item for item in attempts
                if item['completed_batches'] == item['batch_count']]
    if not complete:
        return None
    return min(complete, key=lambda item: (item['changeover_hours'], item['batch_count']))
