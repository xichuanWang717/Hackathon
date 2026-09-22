"""带生效时间的设备增减事件。"""
from dataclasses import dataclass
from datetime import datetime
from typing import Literal


@dataclass(frozen=True)
class DeviceEvent:
    action: Literal['add', 'remove', 'downtime', 'restore']
    device: str
    effective_at: datetime
    reason: str = ''
    process: str = ''

    def can_accept(self, start: datetime) -> bool:
        if self.action in {'add', 'restore'}:
            return start >= self.effective_at
        return start < self.effective_at


def partition_tasks_for_device_event(tasks, event: DeviceEvent):
    """删除/停机：生效前已开工冻结，生效时刻起的未开工任务撤下。"""
    if event.action not in {'remove', 'downtime'}:
        return list(tasks), []
    kept, withdrawn = [], []
    for task in tasks:
        if task.device == event.device and task.start >= event.effective_at:
            withdrawn.append(task)
        else:
            kept.append(task)
    return kept, withdrawn


@dataclass(frozen=True)
class CapacityEventResult:
    status: str
    snapshot: 'CapacitySnapshot'
    message: str = ''


class CapacitySnapshot:
    def __init__(self, devices):
        self.devices = {process: set(codes) for process, codes in devices.items()}

    def apply(self, event: DeviceEvent) -> CapacityEventResult:
        process = event.process
        if process not in self.devices:
            return CapacityEventResult('unknown_process', self, f'未知工序：{process}')
        copied = CapacitySnapshot(self.devices)
        codes = copied.devices[process]
        if event.action in {'remove', 'downtime'}:
            if event.device not in codes:
                return CapacityEventResult('unknown_device', self, f'设备不存在：{event.device}')
            if len(codes) == 1:
                return CapacityEventResult('capacity_shortage', self, '删除后该工序无可用设备')
            codes.remove(event.device)
        elif event.action in {'add', 'restore'}:
            codes.add(event.device)
        else:
            return CapacityEventResult('invalid_action', self, f'无效动作：{event.action}')
        return CapacityEventResult('applied', copied)
