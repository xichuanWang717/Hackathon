from types import SimpleNamespace

from scheduler.objective import ObjectiveVector, evaluate_objective, is_strict_improvement


def test_fewer_hard_violations_beats_more_scheduled_orders():
    before = ObjectiveVector(0, 3, 0, 1, 1, 40, 40, -10, 5, 20)
    after = ObjectiveVector(0, 2, 1, 2, 2, 80, 80, -9, 8, 30)
    assert is_strict_improvement(before, after)


def test_equal_objective_keeps_original_schedule():
    same = ObjectiveVector(0, 2, 1, 2, 2, 80, 80, -9, 8, 30)
    assert not is_strict_improvement(same, same)


def test_missing_penalty_uses_late_hours_proxy():
    orders = [SimpleNamespace(oid='A', tier=2, delay_tolerance_hours=0)]
    status = {'A': {'status': 'exception', 'margin_h': -12}}
    result = evaluate_objective(orders, status, [], changeover_hours=2, load_imbalance=0.1)
    assert result.vector.hard_violations == 0
    assert result.vector.late_orders == 1
    assert result.vector.late_hours == 12
    assert result.penalty_source == 'proxy_late_hours'


def test_p0_infeasibility_is_first_objective_component():
    orders = [SimpleNamespace(oid='RUSH', tier=0, delay_tolerance_hours=0)]
    status = {'RUSH': {'status': 'manual'}}
    result = evaluate_objective(orders, status, [], changeover_hours=0, load_imbalance=0)
    assert result.vector.infeasible_p0 == 1


def test_uncommitted_order_is_worse_than_a_late_but_planned_order():
    orders = [SimpleNamespace(oid='A', tier=2, delay_tolerance_hours=0)]
    manual = evaluate_objective(orders, {'A': {'status': 'manual'}}, [], 0, 0)
    late = evaluate_objective(
        orders, {'A': {'status': 'exception', 'margin_h': -100}}, [], 0, 0
    )
    assert late.vector < manual.vector


def test_more_strict_on_time_orders_beat_lower_total_lateness():
    orders = [
        SimpleNamespace(oid='A', tier=2, delay_tolerance_hours=0),
        SimpleNamespace(oid='B', tier=2, delay_tolerance_hours=0),
    ]
    one_on_time = evaluate_objective(
        orders,
        {'A': {'status': 'scheduled', 'margin_h': 1},
         'B': {'status': 'exception', 'margin_h': -100}}, [], 0, 0,
    )
    none_on_time = evaluate_objective(
        orders,
        {'A': {'status': 'exception', 'margin_h': -1},
         'B': {'status': 'exception', 'margin_h': -1}}, [], 0, 0,
    )
    assert one_on_time.vector < none_on_time.vector


def test_enterprise_penalty_participates_before_total_late_hours():
    orders = [SimpleNamespace(oid='A', tier=2, delay_tolerance_hours=0)]
    high_penalty = evaluate_objective(
        orders, {'A': {'status': 'exception', 'margin_h': -2}}, [], 0, 0,
        penalty_by_order={'A': 100},
    )
    low_penalty = evaluate_objective(
        orders, {'A': {'status': 'exception', 'margin_h': -10}}, [], 0, 0,
        penalty_by_order={'A': 1},
    )
    assert low_penalty.vector < high_penalty.vector
