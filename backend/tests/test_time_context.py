from datetime import datetime

from scheduler.presenter import build_time_context


def test_time_context_keeps_beijing_now_outside_initial_schedule_window():
    context = build_time_context(
        datetime(2026, 8, 3, 0, 0),
        datetime(2026, 9, 20, 9, 54),
    )

    assert context['schedule_baseline'] == '2026-08-03T00:00'
    assert context['platform_now'] == '2026-09-20T09:54+08:00'
    assert context['default_view_start'] == '2026-09-14T00:00+08:00'
    assert context['default_view_days'] == 7
    assert context['timezone'] == 'Asia/Shanghai'
