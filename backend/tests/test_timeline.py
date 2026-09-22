from datetime import datetime, timedelta

from scheduler.engine import Timeline, changeover_hours, valid_handover


def test_any_actual_changeover_uses_one_hour():
    assert changeover_hours('wire|2', 'wire|10') == 1.0
    assert changeover_hours('rope|8', 'strand|3') == 1.0
    assert changeover_hours('wire|2', 'wire|2') == 0.0


def test_asap_rejects_past_horizon():
    timeline = Timeline('M1', horizon_end=datetime(2026, 9, 20))
    assert timeline.place(25, datetime(2026, 9, 19), None, 'wire|1', 'asap') is None


def test_asap_has_no_artificial_cutoff_without_horizon():
    timeline = Timeline('M1', horizon_end=None)

    placed = timeline.place(25, datetime(2028, 1, 1), None, 'wire|1', 'asap')

    assert placed is not None
    assert placed[1] == datetime(2028, 1, 2, 1)


def test_handover_boundaries_are_inclusive():
    end = datetime(2026, 9, 10, 8)
    assert valid_handover(end, end + timedelta(hours=2))
    assert valid_handover(end, end + timedelta(hours=72))
    assert not valid_handover(end, end + timedelta(hours=1, minutes=59))
    assert not valid_handover(end, end + timedelta(hours=72, minutes=1))
