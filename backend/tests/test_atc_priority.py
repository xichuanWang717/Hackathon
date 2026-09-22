from datetime import datetime, timedelta
from types import SimpleNamespace

from scheduler.atc_priority import atc_priority_key


ANCHOR = datetime(2026, 9, 6)


def order(oid, due_hours):
    return SimpleNamespace(oid=oid, delivery=ANCHOR + timedelta(hours=due_hours), qty_m=100)


def test_shorter_job_wins_when_due_dates_are_equal():
    short = atc_priority_key(order('S', 100), 10, ANCHOR, average_hours=20, k=2)
    long = atc_priority_key(order('L', 100), 40, ANCHOR, average_hours=20, k=2)
    assert short < long


def test_near_due_job_can_beat_shorter_far_due_job():
    urgent = atc_priority_key(order('U', 20), 15, ANCHOR, average_hours=20, k=1)
    far_short = atc_priority_key(order('F', 200), 5, ANCHOR, average_hours=20, k=1)
    assert urgent < far_short


def test_missing_due_sorts_last():
    item = order('X', 100)
    item.delivery = None
    assert atc_priority_key(item, 10, ANCHOR, 20, 2)[0] == float('inf')
