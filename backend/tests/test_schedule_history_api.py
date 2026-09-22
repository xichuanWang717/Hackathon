from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import server
from scheduler.schedule_history import ScheduleHistoryStore


def test_history_routes_return_summaries_details_and_404(tmp_path, monkeypatch):
    store = ScheduleHistoryStore(tmp_path)
    store.save({'tasks': [{'machine': '8103'}]}, created_by='系统', reason='初始排产',
               event_type='initial_schedule', schedule_version='SCH-1')
    monkeypatch.setitem(server.STATE, 'schedule_history', store)

    listing = server.schedule_history_list(month=None)
    detail = server.schedule_history_detail('SCH-1')
    with pytest.raises(HTTPException) as missing:
        server.schedule_history_detail('MISSING')

    assert listing['versions'][0]['schedule_version'] == 'SCH-1'
    assert 'dashboard' not in listing['versions'][0]
    assert detail['dashboard']['tasks'][0]['machine'] == '8103'
    assert missing.value.status_code == 404


def test_history_list_accepts_month_filter(tmp_path, monkeypatch):
    store = ScheduleHistoryStore(tmp_path)
    store.save({'time_context': {'platform_now': '2026-09-22T08:00:00+08:00'}},
               created_by='系统', reason='九月计划', event_type='initial_schedule',
               schedule_version='SCH-SEP')
    monkeypatch.setitem(server.STATE, 'schedule_history', store)

    assert len(server.schedule_history_list(month='2026-09')['versions']) == 1
    assert server.schedule_history_list(month='2026-08')['versions'] == []


def test_apply_replan_archives_published_dashboard(tmp_path, monkeypatch):
    store = ScheduleHistoryStore(tmp_path)
    monkeypatch.setitem(server.STATE, 'schedule_history', store)
    monkeypatch.setitem(server.STATE, 'ready', True)
    monkeypatch.setitem(server.STATE, 'engine', SimpleNamespace())
    monkeypatch.setitem(server.STATE, 'base', SimpleNamespace())
    monkeypatch.setattr(server, 'publish_candidate', lambda *args: {
        'ok': True, 'candidate_version': 'CAND-1', 'confirmed_by': '张三',
        'reason': '客户急需', 'confirmed_at': '2026-09-22T10:00:00',
    })
    monkeypatch.setattr(server, 'build_dashboard', lambda *args: {
        'tasks': [{'machine': '8149'}], 'kpi': {'strict_on_time_rate': 0.91},
    })
    response = server.apply_replan(server.ReplanApplyBody(
        candidate_version='CAND-1', option_id='B',
        confirmed_by='张三', reason='客户急需'))

    snapshot = store.list_versions()[0]
    assert snapshot['created_by'] == '张三'
    assert snapshot['reason'] == '客户急需'
    assert snapshot['event_type'] == 'rush_order'
    assert response['schedule_version'] == snapshot['schedule_version']
