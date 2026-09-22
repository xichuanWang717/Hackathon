from types import SimpleNamespace

from scheduler.batching import candidate_batch_counts, choose_complete_attempt, ordered_batch_candidates
from scheduler.engine import Engine


def test_batch_candidates_are_bounded_and_stable():
    order = SimpleNamespace(qty_m=10000)
    assert candidate_batch_counts(order, 70) == (1, 2, 3, 4, 6, 8, 12)


def test_small_order_does_not_create_unnecessary_batches():
    order = SimpleNamespace(qty_m=100)
    assert candidate_batch_counts(order, 10) == (1,)


def test_partial_attempt_is_never_selected_as_complete():
    attempts = [
        {'batch_count': 3, 'completed_batches': 1, 'changeover_hours': 0},
        {'batch_count': 2, 'completed_batches': 2, 'changeover_hours': 4},
    ]
    assert choose_complete_attempt(attempts)['batch_count'] == 2


def test_complete_attempt_prefers_less_changeover_then_fewer_batches():
    attempts = [
        {'batch_count': 4, 'completed_batches': 4, 'changeover_hours': 2},
        {'batch_count': 2, 'completed_batches': 2, 'changeover_hours': 2},
    ]
    assert choose_complete_attempt(attempts)['batch_count'] == 2


def test_attempt_order_starts_near_target_batch_hours():
    order = SimpleNamespace(qty_m=10000)
    assert ordered_batch_candidates(order, 70) == (3, 2, 4, 1, 6, 8, 12)


def test_engine_limits_batch_attempts_for_api_latency():
    engine = Engine([], idx=object())
    assert engine.max_batch_attempts == 3
