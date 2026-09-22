from datetime import datetime, timedelta

from scheduler.kpi import compute_kpis


def test_kpi_separates_strict_and_tolerant_delivery():
    due = datetime(2026, 9, 10)
    rows = [
        {'order_id': 'A', 'due': due, 'completed_at': due, 'tolerance_hours': 0},
        {'order_id': 'B', 'due': due, 'completed_at': due + timedelta(hours=48), 'tolerance_hours': 72},
        {'order_id': 'C', 'due': due, 'completed_at': None, 'tolerance_hours': 0},
    ]
    kpi = compute_kpis(rows)
    assert kpi['eligible_orders'] == 3
    assert kpi['strict_on_time_rate'] == 1 / 3
    assert kpi['commitment_met_rate'] == 2 / 3

