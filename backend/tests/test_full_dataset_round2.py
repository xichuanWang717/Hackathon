from types import SimpleNamespace

from run_round2_benchmark import build_benchmark_record
from scheduler.engine import Engine


def test_benchmark_record_keeps_kpi_numerators_and_denominators():
    result = SimpleNamespace(
        tasks=[1, 2], manual=[1], exceptions=[1], feasibility='feasible',
        validation={'valid': True, 'violations': []}, changeover_hours=3,
        kpi={'strict_on_time_rate': 0.25, 'explicit_late_rate': 0.5,
             'uncommitted_rate': 0.25,
             'kpi_scope': {'current_window': {
                 'denominator': 4, 'strict_on_time_orders': 1,
                 'explicit_late_orders': 2, 'uncommitted_orders': 1}}},
    )
    row = build_benchmark_record('round2', result, 1.25)
    assert row['current_window'] == {
        'denominator': 4, 'strict_on_time_orders': 1,
        'explicit_late_orders': 2, 'uncommitted_orders': 1,
    }
    assert row['runtime_seconds'] == 1.25
    assert row['valid'] is True


def test_benchmark_record_does_not_treat_future_orders_as_current():
    result = SimpleNamespace(
        tasks=[], manual=[], exceptions=[], feasibility='feasible',
        validation={'valid': True, 'violations': []}, changeover_hours=0,
        kpi={'strict_on_time_rate': 1.0, 'explicit_late_rate': 0.0,
             'uncommitted_rate': 0.0,
             'kpi_scope': {
                 'current_window': {'denominator': 1, 'strict_on_time_orders': 1,
                                    'explicit_late_orders': 0, 'uncommitted_orders': 0},
                 'future': {'denominator': 100}}},
    )
    row = build_benchmark_record('round2', result, 1)
    assert row['current_window']['denominator'] == 1


def test_engine_can_disable_adaptive_batching_for_fair_baseline():
    engine = Engine([], idx=object(), adaptive_batching=False)
    assert engine.adaptive_batching is False
