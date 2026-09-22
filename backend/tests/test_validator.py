from datetime import datetime, timedelta

from scheduler.engine import Task
from scheduler.validator import validate_schedule


ANCHOR = datetime(2026, 9, 6)


def task(order, process, device, start_h, end_h, batch=0):
    return Task(order, order, process, device, batch,
                ANCHOR + timedelta(hours=start_h), ANCHOR + timedelta(hours=end_h))


def test_validator_rejects_overlap_horizon_missing_chain_and_r6():
    tasks = [
        task('A', '拉丝', 'M1', 0, 4), task('B', '拉丝', 'M1', 3, 5),
        task('A', '捻股', 'M2', 80, 84), task('A', '合绳', 'M3', 86, 90),
        task('C', '拉丝', 'M4', 337, 338),
    ]
    report = validate_schedule(tasks, ANCHOR, ANCHOR + timedelta(days=14))
    codes = {item.code for item in report.violations}
    assert {'RESOURCE_NO_OVERLAP', 'HORIZON', 'CHAIN_COMPLETE', 'R6_MAX_GAP'} <= codes
    assert report.valid is False

