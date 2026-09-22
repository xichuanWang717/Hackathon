from datetime import datetime, timedelta
from types import SimpleNamespace

from scheduler.order_classification import classify_order


ANCHOR = datetime(2026, 9, 6)


def order(done=False, flags=None, due_h=100):
    return SimpleNamespace(
        done=done,
        flags=flags or [],
        delivery=ANCHOR + timedelta(hours=due_h),
    )


def test_completed_order_is_listed_separately():
    assert classify_order(order(done=True), 10, {}, ANCHOR) == '已完成'


def test_flagged_order_needs_data_before_optimization():
    assert classify_order(order(flags=['规格无法解析']), None, {}, ANCHOR) == '数据待补'


def test_scheduled_on_time_order_is_protected():
    status = {'status': 'scheduled', 'margin_h': 5}
    assert classify_order(order(), 20, status, ANCHOR) == '已准时保护'


def test_theoretically_feasible_but_late_order_is_recoverable():
    status = {'status': 'exception', 'margin_h': -10}
    assert classify_order(order(due_h=100), 80, status, ANCHOR) == '可抢救'


def test_order_late_even_in_empty_shop_is_temporarily_impossible():
    status = {'status': 'exception', 'margin_h': -10}
    assert classify_order(order(due_h=50), 80, status, ANCHOR) == '物理上暂不可准时'


def test_missing_capacity_needs_data_review():
    assert classify_order(order(), None, {'status': 'manual'}, ANCHOR) == '数据待补'
