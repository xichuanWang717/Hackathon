from datetime import datetime, timedelta

from scheduler.policies import DelayPolicy, classify_priority, parse_delay_policy_row


def test_missing_policy_defaults_to_hard():
    policy = parse_delay_policy_row({'订单号': 'A1'})
    assert (policy.code, policy.tolerance_hours, policy.confirmed) == ('hard', 0, False)


def test_only_enterprise_source_enables_72h():
    ok = parse_delay_policy_row({'延期策略': '可延期3天', '来源': 'enterprise_import'})
    bad = parse_delay_policy_row({'延期策略': '可延期3天', '来源': 'model_guess'})
    assert (ok.code, ok.tolerance_hours, ok.confirmed) == ('tolerant_72h', 72, True)
    assert (bad.code, bad.tolerance_hours, bad.confirmed) == ('hard', 0, False)


def test_policy_explanation_is_human_readable():
    policy = parse_delay_policy_row({
        '延期策略': '可延期3天', '来源': 'enterprise_manual', '备注': '客户书面确认'
    })
    assert '72' in policy.explanation
    assert '客户书面确认' in policy.explanation


def test_business_priority_order_is_p0_to_p4():
    now = datetime(2026, 9, 6)
    hard = DelayPolicy()
    tolerant = DelayPolicy('tolerant_72h', 72, 'enterprise_manual', confirmed=True)
    assert classify_priority(True, now + timedelta(days=9), hard, now) == 0
    assert classify_priority(False, now + timedelta(hours=24), hard, now) == 1
    assert classify_priority(False, now + timedelta(days=9), hard, now) == 2
    assert classify_priority(False, now + timedelta(hours=24), tolerant, now) == 3
    assert classify_priority(False, now + timedelta(days=9), tolerant, now) == 4
