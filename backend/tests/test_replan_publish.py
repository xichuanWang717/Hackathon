from types import SimpleNamespace

import pytest

from scheduler.replan_publish import publish_candidate


def make_state():
    rush = SimpleNamespace(oid='JW-260918-999', short_id='JW-260918-999')
    option = SimpleNamespace(
        option_id='B', applicable=True, result=SimpleNamespace(feasibility='feasible'),
        inserted_orders=[rush], kpi={'strict_on_time_rate': 0.9},
    )
    engine = SimpleNamespace(orders=[])
    return {
        'engine': engine, 'base': SimpleNamespace(kpi={'strict_on_time_rate': 0.8}),
        'built_at': 'BASE-1', 'audit_log': [],
        'replan_candidates': {
            'CAND-1': {'baseline_version': 'BASE-1', 'options': {'B': option},
                       'published': False, 'published_response': None}
        },
    }


def test_confirmed_candidate_adds_rush_order_and_publishes_schedule_once():
    state = make_state()

    first = publish_candidate(state, 'CAND-1', 'B', '计划员张三', '客户急需')
    second = publish_candidate(state, 'CAND-1', 'B', '计划员张三', '重复点击')

    assert [order.oid for order in state['engine'].orders] == ['JW-260918-999']
    assert state['base'] is state['replan_candidates']['CAND-1']['options']['B'].result
    assert first['inserted_order_ids'] == ['JW-260918-999']
    assert second == first
    assert len(state['audit_log']) == 1


def test_stale_candidate_cannot_overwrite_a_newer_baseline():
    state = make_state()
    state['built_at'] = 'BASE-2'

    with pytest.raises(ValueError, match='基线已变化'):
        publish_candidate(state, 'CAND-1', 'B', '计划员张三', '客户急需')


def test_inapplicable_candidate_cannot_be_published():
    state = make_state()
    state['replan_candidates']['CAND-1']['options']['B'].applicable = False

    with pytest.raises(ValueError, match='不可发布'):
        publish_candidate(state, 'CAND-1', 'B', '计划员张三', '客户急需')
