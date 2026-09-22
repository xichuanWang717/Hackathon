from datetime import datetime

import pytest

from scheduler.config import ScheduleConfig
from scheduler.dataloader import Order
from scheduler.official import build_official_schedule, visible_orders_as_of


def _order(oid, release_at):
    return Order(
        oid, '钢丝绳', '6*19S+FC-10mm', None, 1000, 2400,
        datetime(2026, 9, 10), False, False, release_at=release_at,
    )


def test_visible_orders_excludes_future_order_even_if_its_document_would_exist():
    cutoff = datetime(2026, 8, 3)
    orders = [_order('NOW', cutoff), _order('FUTURE', datetime(2026, 8, 10))]

    visible, future, invalid = visible_orders_as_of(orders, cutoff)

    assert [order.oid for order in visible] == ['NOW']
    assert [order.oid for order in future] == ['FUTURE']
    assert invalid == []


def test_visible_orders_treats_missing_order_date_as_invalid_not_visible():
    visible, future, invalid = visible_orders_as_of(
        [_order('MISSING', None)], datetime(2026, 8, 3))

    assert visible == []
    assert future == []
    assert [order.oid for order in invalid] == ['MISSING']


def test_visibility_cutoff_does_not_move_the_production_baseline(monkeypatch):
    seen = []

    class StopAfterLoad(Exception):
        pass

    def fake_load(anchor, **kwargs):
        seen.append(anchor)
        raise StopAfterLoad

    monkeypatch.setattr('scheduler.official.load_orders', fake_load)

    with pytest.raises(StopAfterLoad):
        build_official_schedule(
            config=ScheduleConfig(schedule_anchor=datetime(2026, 8, 3)),
            as_of=datetime(2026, 9, 7),
        )

    assert seen == [datetime(2026, 8, 3)]
