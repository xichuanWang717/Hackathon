from datetime import datetime
from types import SimpleNamespace

from scheduler.kpi import classify_kpi_scope, compute_scoped_kpis


ANCHOR = datetime(2026, 9, 6)
END = datetime(2026, 9, 20)


def order(order_id, due, tolerance=0):
    return SimpleNamespace(oid=order_id, delivery=due, delay_tolerance_hours=tolerance)


def test_scope_includes_both_window_boundaries():
    assert classify_kpi_scope(order('A', ANCHOR), ANCHOR, END) == 'current_window'
    assert classify_kpi_scope(order('B', END), ANCHOR, END) == 'current_window'
    assert classify_kpi_scope(order('C', datetime(2026, 9, 5)), ANCHOR, END) == 'backlog'
    assert classify_kpi_scope(order('D', datetime(2026, 9, 21)), ANCHOR, END) == 'future'


def test_end_date_remains_in_scope_after_end_of_day_cutoff():
    due = datetime(2026, 9, 20, 23, 59)
    assert classify_kpi_scope(order('A', due), ANCHOR, END) == 'current_window'


def test_uncommitted_is_not_called_explicitly_late():
    orders = [order('A', datetime(2026, 9, 10))]
    kpi = compute_scoped_kpis(orders, {'A': {'status': 'manual'}}, ANCHOR, END)
    current = kpi['kpi_scope']['current_window']
    assert current['explicit_late_orders'] == 0
    assert current['uncommitted_orders'] == 1
    assert current['denominator'] == 1


def test_future_orders_do_not_reduce_current_window_rate():
    orders = [order('A', datetime(2026, 9, 10)), order('B', datetime(2026, 10, 10))]
    status = {'A': {'status': 'scheduled'}, 'B': {'status': 'manual'}}
    kpi = compute_scoped_kpis(orders, status, ANCHOR, END)
    assert kpi['strict_on_time_rate'] == 1.0
    assert kpi['future_order_summary']['orders'] == 1


def test_confirmed_tolerance_changes_commitment_not_strict_rate():
    orders = [order('A', datetime(2026, 9, 10), tolerance=72)]
    status = {'A': {'status': 'exception', 'margin_h': -48}}
    kpi = compute_scoped_kpis(orders, status, ANCHOR, END)
    assert kpi['strict_on_time_rate'] == 0.0
    assert kpi['commitment_met_rate'] == 1.0
