from datetime import datetime
from types import SimpleNamespace

from scheduler.two_stage import append_uncommitted_asap


class FakeEngine:
    def __init__(self):
        self.calls = []

    def _schedule_order(self, order, result, now, backlog=False):
        self.calls.append((order.oid, now, backlog))
        result.tasks.append(SimpleNamespace(order_id=order.oid))
        result.order_status[order.oid] = {'status': 'exception', 'margin_h': -1}


def order(oid, flags=None, done=False):
    return SimpleNamespace(oid=oid, flags=flags or [], done=done, spec=object(), qty_m=1)


def test_second_stage_only_appends_valid_uncommitted_orders():
    protected_task = SimpleNamespace(order_id='protected')
    result = SimpleNamespace(
        tasks=[protected_task],
        manual=[
            {'order_id': 'retry'},
            {'order_id': 'bad'},
        ],
        order_status={
            'protected': {'status': 'scheduled'},
            'retry': {'status': 'manual'},
            'bad': {'status': 'manual'},
        },
    )
    engine = FakeEngine()
    orders = [order('protected'), order('retry'), order('bad', flags=['数据缺失'])]

    report = append_uncommitted_asap(engine, result, orders, datetime(2026, 9, 6))

    assert engine.calls == [('retry', datetime(2026, 9, 6), True)]
    assert result.tasks[0] is protected_task
    assert report.attempted == ['retry']
    assert report.appended == ['retry']
    assert [row['order_id'] for row in result.manual] == ['bad']


def test_failed_retry_remains_in_manual_queue_without_duplicate_rows():
    class FailingEngine(FakeEngine):
        def _schedule_order(self, order, result, now, backlog=False):
            self.calls.append((order.oid, now, backlog))
            result.manual.append({'order_id': order.oid, 'reason': '仍不可排'})
            result.order_status[order.oid] = {'status': 'manual'}

    result = SimpleNamespace(
        tasks=[], manual=[{'order_id': 'retry', 'reason': '第一阶段不可排'}],
        order_status={'retry': {'status': 'manual'}},
    )

    report = append_uncommitted_asap(FailingEngine(), result, [order('retry')],
                                     datetime(2026, 9, 6))

    assert report.appended == []
    assert [row['order_id'] for row in result.manual] == ['retry']


def test_second_stage_reports_each_order_progress():
    result = SimpleNamespace(
        tasks=[], manual=[{'order_id': 'A'}, {'order_id': 'B'}],
        order_status={'A': {'status': 'manual'}, 'B': {'status': 'manual'}},
    )
    progress = []

    append_uncommitted_asap(
        FakeEngine(), result, [order('A'), order('B')], datetime(2026, 9, 6),
        progress_callback=lambda current, total, oid: progress.append((current, total, oid)),
    )

    assert progress == [(0, 2, ''), (1, 2, 'A'), (2, 2, 'B')]
