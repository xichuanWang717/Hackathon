from dataclasses import dataclass
from datetime import datetime
from types import SimpleNamespace

from scheduler.local_search import SearchLimits, improve_schedule


ANCHOR = datetime(2026, 9, 6)
END = datetime(2026, 9, 20)


@dataclass
class FakeResult:
    order_status: dict
    tasks: list
    changeover_hours: float = 0
    device_util: dict = None
    validation: dict = None

    def __post_init__(self):
        self.device_util = self.device_util or {}
        self.validation = self.validation or {'valid': True, 'violations': []}


class FakeEngine:
    def __init__(self, candidates):
        self.candidates = candidates
        self.order_rank_overrides = {}

    def run(self, _orders):
        oid = next(iter(self.order_rank_overrides))
        return self.candidates[oid]


def make_order(oid, tier=2):
    return SimpleNamespace(oid=oid, tier=tier, delivery=datetime(2026, 9, 10),
                           delay_tolerance_hours=0)


def test_swap_is_accepted_when_hard_violations_drop():
    orders = [make_order('A'), make_order('B')]
    base = FakeResult({'A': {'status': 'manual'}, 'B': {'status': 'scheduled'}}, [])
    candidate = FakeResult({'A': {'status': 'scheduled'}, 'B': {'status': 'scheduled'}}, [])
    report = improve_schedule(FakeEngine({'A': candidate}), base, orders,
                              SearchLimits(20, 1), ANCHOR, END)
    assert report.objective_after < report.objective_before
    assert report.accepted_swaps == ['A']


def test_more_completed_orders_cannot_increase_hard_violations():
    orders = [make_order('A'), make_order('B')]
    base = FakeResult({'A': {'status': 'manual'}, 'B': {'status': 'scheduled'}}, [])
    worse = FakeResult({'A': {'status': 'scheduled'}, 'B': {'status': 'manual'}}, [])
    report = improve_schedule(FakeEngine({'A': worse}), base, orders,
                              SearchLimits(20, 1), ANCHOR, END)
    assert report.accepted_swaps == []


def test_started_tasks_are_never_moved():
    started = SimpleNamespace(order_id='B', device='M1', batch=0,
                              start=datetime(2026, 9, 6, 7), end=datetime(2026, 9, 6, 9))
    moved = SimpleNamespace(order_id='B', device='M2', batch=0,
                            start=datetime(2026, 9, 6, 7), end=datetime(2026, 9, 6, 9))
    orders = [make_order('A'), make_order('B')]
    base = FakeResult({'A': {'status': 'manual'}, 'B': {'status': 'scheduled'}}, [started])
    candidate = FakeResult({'A': {'status': 'scheduled'}, 'B': {'status': 'scheduled'}}, [moved])
    report = improve_schedule(FakeEngine({'A': candidate}), base, orders,
                              SearchLimits(20, 1), ANCHOR, END,
                              now=datetime(2026, 9, 6, 8))
    assert report.accepted_swaps == []
    assert report.rejected_attempts[0]['reason'] == 'frozen_task_changed'
