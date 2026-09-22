from datetime import datetime
from types import SimpleNamespace
import pytest

from scheduler.urgency import dynamic_urgency_key, estimate_min_chain_hours


ANCHOR = datetime(2026, 9, 6)
DUE = datetime(2026, 9, 10)


def order(oid, qty_m=600, qty_kg=720, tier=2, tolerance=0):
    return SimpleNamespace(
        oid=oid,
        qty_m=qty_m,
        qty_kg=qty_kg,
        delivery=DUE,
        tier=tier,
        delay_tolerance_hours=tolerance,
        spec=SimpleNamespace(total_strands=6, outer_wire_count=114),
    )


def match(rope_rate=10, strand_rate=20, wire_speed_mps=8,
          strand_len_m=1200):
    return SimpleNamespace(
        rope_rows=[('R1', rope_rate, None)],
        strand_rows=[('S1', strand_rate, None)],
        wire_devs=[('W1', wire_speed_mps, None)],
        strand_len_m=strand_len_m,
    )


def test_estimate_min_chain_hours_uses_all_three_processes_and_handovers():
    # 拉丝须为 600m × 6 × 19 × 1.03 ÷ 8m/s，不能误用成品长度。
    assert estimate_min_chain_hours(order('A'), match()) == pytest.approx(9.44625)


def test_longer_job_with_same_due_has_less_slack_and_sorts_first():
    short = dynamic_urgency_key(order('short'), match(wire_speed_mps=16), ANCHOR)
    long = dynamic_urgency_key(order('long'), match(wire_speed_mps=8), ANCHOR)

    assert long < short


def test_manual_p0_sorts_before_non_p0_even_with_more_slack():
    p0 = dynamic_urgency_key(order('rush', qty_kg=10, tier=0), match(), ANCHOR)
    normal = dynamic_urgency_key(order('normal', qty_kg=1000), match(), ANCHOR)

    assert p0 < normal


def test_confirmed_tolerance_increases_commitment_slack_by_72_hours():
    hard = dynamic_urgency_key(order('hard'), match(), ANCHOR)
    tolerant = dynamic_urgency_key(order('tolerant', tolerance=72), match(), ANCHOR)

    assert tolerant[1] - hard[1] == pytest.approx(72.0)


def test_unmatched_capacity_sorts_last_without_crashing():
    unavailable = match()
    unavailable.rope_rows = []

    key = dynamic_urgency_key(order('bad'), unavailable, ANCHOR)

    assert key[1] == float('inf')
