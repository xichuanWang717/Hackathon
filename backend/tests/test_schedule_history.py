import json

from datetime import datetime

from scheduler.schedule_history import ScheduleHistoryStore, monday_week_starts


def dashboard(label):
    return {'kpi': {'label': label}, 'tasks': [{'machine': '8103', 'bars': []}],
            'time_context': {'platform_now': '2026-09-22T10:00:00+08:00'}}


def test_save_links_parent_and_survives_store_recreation(tmp_path):
    store = ScheduleHistoryStore(tmp_path)
    first = store.save(dashboard('first'), created_by='系统', reason='初始排产',
                       event_type='initial_schedule', schedule_version='SCH-1')
    second = store.save(dashboard('second'), created_by='张三', reason='人工调序',
                        event_type='manual_adjust', schedule_version='SCH-2')

    restored = ScheduleHistoryStore(tmp_path)
    assert first['parent_version'] is None
    assert second['parent_version'] == 'SCH-1'
    assert [item['schedule_version'] for item in restored.list_versions()] == ['SCH-2', 'SCH-1']
    assert restored.load('SCH-1')['dashboard']['kpi']['label'] == 'first'


def test_duplicate_version_is_idempotent(tmp_path):
    store = ScheduleHistoryStore(tmp_path)
    first = store.save(dashboard('first'), created_by='系统', reason='初始排产',
                       event_type='initial_schedule', schedule_version='SCH-1')
    duplicate = store.save(dashboard('changed'), created_by='其他人', reason='重复',
                           event_type='manual_adjust', schedule_version='SCH-1')

    assert duplicate == first
    assert len(store.list_versions()) == 1
    assert store.load('SCH-1')['dashboard']['kpi']['label'] == 'first'


def test_retains_only_latest_limit(tmp_path):
    store = ScheduleHistoryStore(tmp_path, limit=3)
    for number in range(5):
        store.save(dashboard(str(number)), created_by='系统', reason='发布',
                   event_type='manual_adjust', schedule_version=f'SCH-{number}')

    assert [item['schedule_version'] for item in store.list_versions()] == ['SCH-4', 'SCH-3', 'SCH-2']
    assert store.load('SCH-0') is None


def test_empty_and_corrupt_snapshots_do_not_break_history(tmp_path):
    store = ScheduleHistoryStore(tmp_path)
    assert store.list_versions() == []
    assert store.load('missing') is None

    store.save(dashboard('valid'), created_by='系统', reason='发布',
               event_type='initial_schedule', schedule_version='SCH-OK')
    corrupt = tmp_path / 'snapshots' / 'SCH-BAD.json'
    corrupt.write_text('{broken', encoding='utf-8')
    index = json.loads((tmp_path / 'index.json').read_text(encoding='utf-8'))
    index.insert(0, {'schedule_version': 'SCH-BAD'})
    (tmp_path / 'index.json').write_text(json.dumps(index), encoding='utf-8')

    assert [item['schedule_version'] for item in store.list_versions()] == ['SCH-OK']
    assert store.load('SCH-BAD') is None


def test_snapshot_is_grouped_into_seven_day_plan_with_revision_numbers(tmp_path):
    store = ScheduleHistoryStore(tmp_path)
    first = store.save(dashboard('official'), created_by='系统', reason='正式周计划',
                       event_type='initial_schedule', schedule_version='SCH-WEEK')
    second = store.save(dashboard('rush'), created_by='张三', reason='急单',
                        event_type='rush_order', schedule_version='SCH-RUSH')

    assert first['week_start'] == '2026-09-21'
    assert first['week_end'] == '2026-09-27'
    assert first['plan_key'] == 'WEEK-20260921'
    assert first['version_type'] == 'weekly_official'
    assert first['revision_no'] == 1
    assert second['revision_no'] == 2
    assert [item['schedule_version'] for item in store.list_versions(month='2026-09')] == ['SCH-RUSH', 'SCH-WEEK']
    assert store.list_versions(month='2026-08') == []


def test_replay_weeks_are_strict_monday_to_sunday():
    starts = monday_week_starts(datetime(2026, 8, 3), datetime(2026, 9, 22))

    assert [day.strftime('%Y-%m-%d') for day in starts[:5]] == [
        '2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31']
    assert starts[-1].strftime('%Y-%m-%d') == '2026-09-21'
    assert all(day.weekday() == 0 for day in starts)


def test_historical_replay_can_replace_same_version_without_duplicate(tmp_path):
    store = ScheduleHistoryStore(tmp_path)
    store.save(dashboard('old'), created_by='系统回放', reason='旧口径',
               event_type='historical_replay', schedule_version='REPLAY-20260803')

    replaced = store.save(
        dashboard('new'), created_by='系统回放', reason='订单日期截止口径',
        event_type='historical_replay', schedule_version='REPLAY-20260803',
        replace_existing=True)

    assert replaced['reason'] == '订单日期截止口径'
    assert store.load('REPLAY-20260803')['dashboard']['kpi']['label'] == 'new'
    assert len(store.list_versions()) == 1


def test_non_replay_version_remains_immutable_even_when_replace_requested(tmp_path):
    store = ScheduleHistoryStore(tmp_path)
    first = store.save(dashboard('official'), created_by='系统', reason='正式发布',
                       event_type='initial_schedule', schedule_version='SCH-1')

    duplicate = store.save(
        dashboard('changed'), created_by='系统回放', reason='错误覆盖',
        event_type='historical_replay', schedule_version='SCH-1',
        replace_existing=True)

    assert duplicate == first
    assert store.load('SCH-1')['dashboard']['kpi']['label'] == 'official'
