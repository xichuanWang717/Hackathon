from datetime import datetime, time
from types import SimpleNamespace

from scheduler.time_validation import apply_due_cutoff


def test_apply_due_cutoff_changes_only_clock():
    order = SimpleNamespace(delivery=datetime(2026, 9, 10, 0, 0))
    changed = apply_due_cutoff(order, time(17, 30))
    assert changed.delivery == datetime(2026, 9, 10, 17, 30)
    assert order.delivery == datetime(2026, 9, 10, 0, 0)


def test_all_three_cutoffs_stay_on_same_calendar_date():
    order = SimpleNamespace(delivery=datetime(2026, 9, 20))
    values = [apply_due_cutoff(order, cutoff).delivery for cutoff in
              (time(0, 0), time(17, 30), time(23, 59))]
    assert values == [datetime(2026, 9, 20, 0, 0),
                      datetime(2026, 9, 20, 17, 30),
                      datetime(2026, 9, 20, 23, 59)]
