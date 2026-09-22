from datetime import datetime

from scheduler.presenter import build_time_context


def test_view_start_aligns_to_seven_day_cycle_from_schedule_baseline():
    context = build_time_context(
        datetime(2026, 8, 3), datetime(2026, 9, 22, 16, 30))

    assert context['default_view_start'] == '2026-09-21T00:00+08:00'
    assert context['default_view_end'] == '2026-09-28T00:00+08:00'
    assert context['default_view_days'] == 7
