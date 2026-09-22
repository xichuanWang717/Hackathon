from datetime import datetime
from types import SimpleNamespace

import server


class _History:
    def __init__(self):
        self.saved = []

    def save(self, dashboard, **kwargs):
        self.saved.append((dashboard, kwargs))
        return kwargs


def test_historical_replay_keeps_continuous_baseline_at_each_monday_cutoff(monkeypatch):
    seen = []
    history = _History()

    def fake_build(*args, as_of=None, config=None, **kwargs):
        seen.append((as_of, config.schedule_anchor))
        engine = object()
        result = SimpleNamespace(feasibility='feasible')
        metadata = {'visible_orders': len(seen), 'data_cutoff_at': as_of.isoformat(timespec='minutes')}
        return engine, result, metadata

    monkeypatch.setattr(server, 'build_official_schedule', fake_build)
    monkeypatch.setattr(server, 'build_dashboard', lambda engine, result, now=None:
                        {'time_context': {'platform_now': now.isoformat()}})
    monkeypatch.setitem(server.STATE, 'schedule_history', history)
    monkeypatch.setitem(server.STATE, 'orders_xlsx', None)
    monkeypatch.setitem(server.STATE, 'rated_xlsx', None)

    server.rebuild_historical_replays(datetime(2026, 8, 17, 9, 0))

    assert seen == [
        (datetime(2026, 8, 3), datetime(2026, 8, 3)),
        (datetime(2026, 8, 10), datetime(2026, 8, 3)),
    ]
    assert [item[1]['schedule_version'] for item in history.saved] == [
        'REPLAY-20260803', 'REPLAY-20260810']
    assert all(item[1]['replace_existing'] is True for item in history.saved)
    assert history.saved[0][0]['dataset']['visible_orders'] == 1
    assert history.saved[1][0]['dataset']['visible_orders'] == 2
