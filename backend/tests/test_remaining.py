from datetime import datetime

from scheduler.remaining import compute_remaining_quantity


SNAPSHOT = datetime(2026, 9, 5, 23, 59, 59)


def test_partial_sale_uses_remaining_quantity():
    result = compute_remaining_quantity(1000, 2400, [
        {'sale_at': datetime(2026, 9, 5), 'qty_m': 400, 'qty_kg': 960, 'source_row': 8}
    ], SNAPSHOT)
    assert (result.remaining_m, result.remaining_kg, result.status) == (600, 1440, 'ready')
    assert result.trace[0]['source_row'] == 8


def test_closed_quantity_without_closed_order_needs_review():
    result = compute_remaining_quantity(1000, 2400, [
        {'sale_at': datetime(2026, 9, 5), 'qty_m': 1000, 'qty_kg': 2400}
    ], SNAPSHOT)
    assert result.status == 'state_review'


def test_mismatched_unit_is_not_guessed():
    result = compute_remaining_quantity(1000, 2400, [
        {'sale_at': datetime(2026, 9, 5), 'qty_m': None, 'qty_kg': 960}
    ], SNAPSHOT)
    assert result.status == 'unit_review'


def test_overdelivery_requires_review():
    result = compute_remaining_quantity(1000, 2400, [
        {'sale_at': datetime(2026, 9, 5), 'qty_m': 1100, 'qty_kg': 2500}
    ], SNAPSHOT)
    assert result.status == 'overdelivered'


def test_sales_after_snapshot_do_not_reduce_remaining_quantity():
    result = compute_remaining_quantity(1000, 2400, [
        {'sale_at': datetime(2026, 9, 6), 'qty_m': 400, 'qty_kg': 960}
    ], SNAPSHOT)
    assert (result.remaining_m, result.remaining_kg, result.status) == (1000, 2400, 'ready')
