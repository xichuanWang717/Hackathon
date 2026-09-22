import json
import subprocess
from pathlib import Path


FRONTEND = Path(__file__).resolve().parents[2] / 'frontend'


def test_history_cutoff_label_uses_snapshot_dataset_metadata():
    module = FRONTEND / 'schedule-history-labels.js'
    script = (
        "const f=require(" + json.dumps(str(module)) + ");"
        "process.stdout.write(f.formatScheduleCutoffMeta({dashboard:{dataset:{"
        "data_cutoff_at:'2026-08-03T00:00',visible_orders:5}}}));"
    )

    result = subprocess.run(
        ['node', '-e', script], capture_output=True, text=True,
        encoding='utf-8', errors='replace', check=True,
    )

    assert result.stdout == '数据截止：2026-08-03 00:00 · 当时可见 5 张订单'


def test_history_cutoff_label_does_not_invent_missing_metadata():
    module = FRONTEND / 'schedule-history-labels.js'
    script = (
        "const f=require(" + json.dumps(str(module)) + ");"
        "process.stdout.write(f.formatScheduleCutoffMeta({}));"
    )

    result = subprocess.run(
        ['node', '-e', script], capture_output=True, text=True,
        encoding='utf-8', errors='replace', check=True,
    )

    assert result.stdout == ''


def test_preferred_week_version_uses_latest_official_then_latest_replay():
    module = FRONTEND / 'schedule-history-labels.js'
    items = [
        {'schedule_version': 'REPLAY-R1', 'plan_key': 'WEEK-20260803',
         'version_type': 'weekly_replay', 'revision_no': 1},
        {'schedule_version': 'OFFICIAL-R1', 'plan_key': 'WEEK-20260803',
         'version_type': 'weekly_official', 'revision_no': 1},
        {'schedule_version': 'OFFICIAL-R2', 'plan_key': 'WEEK-20260803',
         'version_type': 'weekly_official', 'revision_no': 2},
        {'schedule_version': 'OTHER', 'plan_key': 'WEEK-20260810',
         'version_type': 'weekly_official', 'revision_no': 9},
    ]
    script = (
        "const f=require(" + json.dumps(str(module)) + ");"
        "const items=" + json.dumps(items) + ";"
        "process.stdout.write(f.preferredScheduleVersion(items,'WEEK-20260803'));"
    )

    result = subprocess.run(
        ['node', '-e', script], capture_output=True, text=True,
        encoding='utf-8', errors='replace', check=True,
    )

    assert result.stdout == 'OFFICIAL-R2'
