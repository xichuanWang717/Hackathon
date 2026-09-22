from datetime import datetime

from scheduler.baseline import edd_order


def test_edd_baseline_orders_by_due_date_then_id():
    rows = [
        {'order_id': 'B', 'due': datetime(2026, 9, 12)},
        {'order_id': 'C', 'due': datetime(2026, 9, 10)},
        {'order_id': 'A', 'due': datetime(2026, 9, 10)},
    ]
    assert [x['order_id'] for x in edd_order(rows)] == ['A', 'C', 'B']
