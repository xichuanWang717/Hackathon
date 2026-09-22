from datetime import datetime, timedelta

from scheduler.replan import assess_rush_feasibility, InterruptProposal


def test_physically_impossible_rush_order_is_not_applicable():
    now = datetime(2026, 9, 6, 8)
    assessment = assess_rush_feasibility(now, now + timedelta(hours=12), [8, 10, 12])
    assert assessment['status'] == 'infeasible'
    assert assessment['earliest_delivery_at'] == now + timedelta(hours=34)
    assert assessment['applicable'] is False


def test_started_task_interruption_requires_named_planner_confirmation():
    proposal = InterruptProposal('P-1', '急单会挤占当前合绳任务')
    assert proposal.applicable is False
    proposal.confirm('计划员张三')
    assert proposal.applicable is True
    assert proposal.audit_log[-1]['actor'] == '计划员张三'
