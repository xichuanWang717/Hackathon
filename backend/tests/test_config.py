from datetime import datetime

import pytest

from scheduler.config import ScheduleConfig


def test_default_schedule_window_starts_after_last_actual_sale_date():
    config = ScheduleConfig()

    assert config.schedule_anchor == datetime(2026, 8, 3, 0, 0)
    assert config.horizon_days == 7
    assert config.horizon_end == datetime(2026, 8, 10, 0, 0)
    assert config.planning_horizon_days is None
    assert config.planning_end is None


def test_kpi_window_and_full_planning_window_are_independent():
    config = ScheduleConfig(horizon_days=14, planning_horizon_days=90)

    assert config.horizon_end == datetime(2026, 8, 17, 0, 0)
    assert config.planning_end == datetime(2026, 11, 1, 0, 0)


def test_default_planning_has_no_artificial_date_cutoff():
    config = ScheduleConfig(horizon_days=14)

    assert config.horizon_end == datetime(2026, 8, 17, 0, 0)
    assert config.planning_end is None


@pytest.mark.parametrize("invalid_days", [0, -1, True, 1.5])
def test_horizon_days_must_be_a_positive_integer(invalid_days):
    with pytest.raises((TypeError, ValueError)):
        ScheduleConfig(horizon_days=invalid_days)
