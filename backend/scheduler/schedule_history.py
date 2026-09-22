"""Durable immutable snapshots of officially published schedules."""
from __future__ import annotations

import copy
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path


def monday_week_starts(start: datetime, through: datetime) -> list[datetime]:
    """Return natural-week starts from the Monday containing start through through."""
    cursor = start.replace(hour=0, minute=0, second=0, microsecond=0) \
        - timedelta(days=start.weekday())
    last = through.replace(hour=0, minute=0, second=0, microsecond=0) \
        - timedelta(days=through.weekday())
    output = []
    while cursor <= last:
        output.append(cursor)
        cursor += timedelta(days=7)
    return output


class ScheduleHistoryStore:
    def __init__(self, root: Path, limit: int = 100):
        self.root = Path(root)
        self.snapshots = self.root / 'snapshots'
        self.index_path = self.root / 'index.json'
        self.limit = max(1, int(limit))
        self.snapshots.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _write_json(path: Path, payload) -> None:
        temporary = path.with_suffix(path.suffix + '.tmp')
        temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
        temporary.replace(path)

    def _read_index(self) -> list[dict]:
        try:
            value = json.loads(self.index_path.read_text(encoding='utf-8'))
            return value if isinstance(value, list) else []
        except (OSError, json.JSONDecodeError):
            return []

    @staticmethod
    def _week_fields(snapshot: dict) -> dict:
        if snapshot.get('week_start'):
            return snapshot
        context = snapshot.get('dashboard', {}).get('time_context', {})
        raw = context.get('platform_now') or snapshot.get('created_at') or '2026-08-03T00:00:00'
        point = datetime.fromisoformat(str(raw).replace('Z', '+00:00')).replace(tzinfo=None)
        baseline = datetime(2026, 8, 3)
        offset = max(0, (point.date() - baseline.date()).days // 7)
        start = baseline + timedelta(days=offset * 7)
        end = start + timedelta(days=6)
        snapshot.update(
            week_start=start.date().isoformat(), week_end=end.date().isoformat(),
            plan_key='WEEK-' + start.strftime('%Y%m%d'),
            version_type={'initial_schedule': 'weekly_official'}.get(
                snapshot.get('event_type'),
                {'historical_replay': 'weekly_replay'}.get(
                    snapshot.get('event_type'), snapshot.get('event_type') or 'migrated')),
            revision_no=snapshot.get('revision_no', 1),
        )
        return snapshot

    def load(self, schedule_version: str) -> dict | None:
        try:
            value = json.loads((self.snapshots / f'{schedule_version}.json').read_text(encoding='utf-8'))
            return self._week_fields(value) if isinstance(value, dict) else None
        except (OSError, json.JSONDecodeError):
            return None

    def list_versions(self, month: str | None = None) -> list[dict]:
        summaries = []
        for item in self._read_index():
            version = item.get('schedule_version') if isinstance(item, dict) else None
            snapshot = self.load(version) if version else None
            if snapshot and (not month or snapshot['week_start'].startswith(month)):
                summaries.append({key: value for key, value in snapshot.items() if key != 'dashboard'})
        return summaries

    def save(self, dashboard: dict, *, created_by: str, reason: str, event_type: str,
             schedule_version: str | None = None,
             replace_existing: bool = False) -> dict:
        version = schedule_version or (
            datetime.now().strftime('SCH-%Y%m%d%H%M%S-') + uuid.uuid4().hex[:8]
        )
        existing = self.load(version)
        may_replace_replay = (
            replace_existing and existing
            and existing.get('event_type') == 'historical_replay'
            and event_type == 'historical_replay'
        )
        if existing and not may_replace_replay:
            return existing

        index = self._read_index()
        if may_replace_replay:
            index = [item for item in index
                     if item.get('schedule_version') != version]
        existing_snapshots = [loaded for item in index if isinstance(item, dict)
                              and (loaded := self.load(item.get('schedule_version', '')))]
        parent = (max(existing_snapshots, key=lambda item: (
            item.get('week_start', ''), item.get('revision_no', 0), item.get('created_at', ''))
        ).get('schedule_version') if existing_snapshots else None)
        draft = {
            'schedule_version': version,
            'created_at': datetime.now().isoformat(timespec='seconds'),
            'created_by': created_by.strip() or '系统',
            'reason': reason.strip(),
            'event_type': event_type,
            'parent_version': parent,
            'dashboard': copy.deepcopy(dashboard),
        }
        snapshot = self._week_fields(draft)
        snapshot['revision_no'] = 1 + sum(
            1 for item in index
            if (loaded := self.load(item.get('schedule_version', '')))
            and loaded.get('plan_key') == snapshot['plan_key'])
        self._write_json(self.snapshots / f'{version}.json', snapshot)
        index.insert(0, {key: value for key, value in snapshot.items() if key != 'dashboard'})
        index.sort(key=lambda item: (
            (loaded := self.load(item.get('schedule_version', ''))) is not None,
            (loaded or {}).get('week_start', ''), (loaded or {}).get('revision_no', 0),
            (loaded or {}).get('created_at', '')), reverse=True)
        removed = index[self.limit:]
        index = index[:self.limit]
        self._write_json(self.index_path, index)
        for item in removed:
            try:
                (self.snapshots / f"{item['schedule_version']}.json").unlink(missing_ok=True)
            except (KeyError, OSError):
                pass
        return snapshot
