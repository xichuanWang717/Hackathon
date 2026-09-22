from datetime import datetime
from types import SimpleNamespace

from scheduler.classification_priority import classification_priority_key


def order(oid, due, tier=2, qty=100):
    return SimpleNamespace(oid=oid, delivery=due, tier=tier, qty_m=qty)


def test_p0_remains_above_all_algorithmic_classes():
    due = datetime(2026, 9, 10)
    rush = classification_priority_key(order('P0', due, tier=0), '物理上暂不可准时')
    protected = classification_priority_key(order('A', due), '已准时保护')
    assert rush < protected


def test_protected_then_recoverable_then_impossible():
    due = datetime(2026, 9, 10)
    protected = classification_priority_key(order('A', due), '已准时保护')
    recoverable = classification_priority_key(order('B', due), '可抢救')
    impossible = classification_priority_key(order('C', due), '物理上暂不可准时')
    assert protected < recoverable < impossible


def test_recoverable_orders_keep_edd_order():
    early = classification_priority_key(order('A', datetime(2026, 9, 10)), '可抢救')
    late = classification_priority_key(order('B', datetime(2026, 9, 12)), '可抢救')
    assert early < late
