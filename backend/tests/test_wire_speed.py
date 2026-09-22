import pytest

from scheduler.bridge import parse_wire_speed_mps, wire_hours_from_meters


def test_wire_speed_capacity_uses_excel_meters_per_second_exactly():
    assert parse_wire_speed_mps('8m/s') == 8.0
    assert wire_hours_from_meters(2000, 8.0) == pytest.approx(2000 / 8 / 3600)
