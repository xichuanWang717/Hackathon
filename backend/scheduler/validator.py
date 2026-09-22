"""与排程启发式解耦的硬约束校验器。"""
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict

from scheduler.engine import valid_handover


@dataclass(frozen=True)
class Violation:
    code: str
    message: str
    order_id: str = ''


@dataclass
class ValidationReport:
    valid: bool
    violations: list[Violation] = field(default_factory=list)


def validate_schedule(tasks, horizon_start: datetime,
                      horizon_end: datetime | None) -> ValidationReport:
    violations: list[Violation] = []
    by_device = defaultdict(list)
    by_chain = defaultdict(dict)
    for item in tasks:
        if (item.start < horizon_start
                or (horizon_end is not None and item.end > horizon_end)
                or item.end <= item.start):
            violations.append(Violation('HORIZON', '任务越出计划窗口或持续时间无效', item.order_id))
        by_device[item.device].append(item)
        by_chain[(item.order_id, item.batch)][item.process] = item

    for device, items in by_device.items():
        ordered = sorted(items, key=lambda x: x.start)
        for previous, current in zip(ordered, ordered[1:]):
            if current.start < previous.end:
                violations.append(Violation('RESOURCE_NO_OVERLAP', f'设备 {device} 存在任务重叠', current.order_id))

    required = {'拉丝', '捻股', '合绳'}
    for (order_id, _batch), chain in by_chain.items():
        if set(chain) != required:
            violations.append(Violation('CHAIN_COMPLETE', '批次三工序链不完整', order_id))
            continue
        if not valid_handover(chain['拉丝'].end, chain['捻股'].start):
            violations.append(Violation('R6_MAX_GAP', '拉丝至捻股交接不在2至72小时', order_id))
        if not valid_handover(chain['捻股'].end, chain['合绳'].start):
            violations.append(Violation('R6_MAX_GAP', '捻股至合绳交接不在2至72小时', order_id))
    return ValidationReport(not violations, violations)
