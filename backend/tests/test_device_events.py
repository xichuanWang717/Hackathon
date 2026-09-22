from datetime import datetime, timedelta

from scheduler.events import CapacitySnapshot, DeviceEvent, partition_tasks_for_device_event
from scheduler.engine import Task


AT = datetime(2026, 9, 6, 8)


def make(start):
    return Task('A', 'A', '合绳', 'M1', 0, start, start + timedelta(hours=2))


def test_remove_device_keeps_started_and_withdraws_not_started():
    event = DeviceEvent('remove', 'M1', AT, '计划检修')
    kept, withdrawn = partition_tasks_for_device_event(
        [make(AT - timedelta(minutes=1)), make(AT)], event)
    assert [x.start for x in kept] == [AT - timedelta(minutes=1)]
    assert [x.start for x in withdrawn] == [AT]


def test_added_device_cannot_accept_work_before_effective_at():
    event = DeviceEvent('add', 'M2', AT)
    assert event.can_accept(AT - timedelta(seconds=1)) is False
    assert event.can_accept(AT) is True


def test_remove_only_compatible_device_returns_capacity_shortage():
    snapshot = CapacitySnapshot({'合绳': {'R1'}})
    result = snapshot.apply(DeviceEvent('remove', 'R1', AT, process='合绳'))
    assert result.status == 'capacity_shortage'
    assert result.snapshot.devices['合绳'] == {'R1'}


def test_add_device_updates_copy_not_original_snapshot():
    snapshot = CapacitySnapshot({'合绳': {'R1'}})
    result = snapshot.apply(DeviceEvent('add', 'R2', AT, process='合绳'))
    assert result.status == 'applied'
    assert result.snapshot.devices['合绳'] == {'R1', 'R2'}
    assert snapshot.devices['合绳'] == {'R1'}
