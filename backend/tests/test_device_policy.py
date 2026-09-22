from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from scheduler.engine import Engine
from scheduler import config as C


ANCHOR = datetime(2026, 9, 6)


class FakeTimeline:
    def __init__(self, code, end_h, load):
        self.code = code
        self.end_h = end_h
        self.load = load

    def place(self, dur_h, earliest, latest_end, key, mode='asap'):
        end = ANCHOR + timedelta(hours=self.end_h)
        return (end - timedelta(hours=dur_h), end, 0, end - timedelta(hours=dur_h))

    def busy_hours(self, start, end):
        return self.load


def result():
    return SimpleNamespace(timelines={
        'slow_low_load': FakeTimeline('slow_low_load', 20, 1),
        'fast_busy': FakeTimeline('fast_busy', 18, 10),
    })


def test_fastest_policy_prefers_shortest_processing_duration():
    engine = Engine([], idx=SimpleNamespace(), device_policy='fastest')
    placed = engine._place_batch(
        result(), [('slow_low_load', 10), ('fast_busy', 4)], 'k',
        ANCHOR, ANCHOR + timedelta(hours=24), 'jit',
    )
    assert placed[0].code == 'fast_busy'


def test_least_loaded_policy_prefers_free_capacity():
    engine = Engine([], idx=SimpleNamespace(), device_policy='least_loaded')
    placed = engine._place_batch(
        result(), [('slow_low_load', 10), ('fast_busy', 4)], 'k',
        ANCHOR, ANCHOR + timedelta(hours=24), 'jit',
    )
    assert placed[0].code == 'slow_low_load'


def test_unknown_device_policy_is_rejected():
    with pytest.raises(ValueError):
        Engine([], idx=SimpleNamespace(), device_policy='unknown')


def test_candidate_pool_is_not_artificially_capped_below_full_strand_matrix():
    # 企业当前捻股产能表含 50 台设备；调度可在全部兼容候选中选择，
    # 而不是把订单永久锁在前 12 台机器。
    assert C.PARALLEL_MAX >= 50
