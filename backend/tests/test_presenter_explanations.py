from datetime import datetime, timedelta
from types import SimpleNamespace

from scheduler.presenter import _select_gantt_machines, build_order_explanations


def test_gantt_machine_selection_keeps_all_three_processes_visible():
    machines = ([{'id': f'W{i}', 'zone': '拉丝'} for i in range(20)]
                + [{'id': f'S{i}', 'zone': '捻股'} for i in range(4)]
                + [{'id': f'R{i}', 'zone': '合绳'} for i in range(4)])
    util = {item['id']: 1.0 if item['zone'] == '拉丝' else 0.1 for item in machines}

    picked = _select_gantt_machines(machines, util, max_rows=12)

    assert {item['zone'] for item in picked} == {'拉丝', '捻股', '合绳'}
    assert sum(item['zone'] == '捻股' for item in picked) == 4
    assert sum(item['zone'] == '合绳' for item in picked) == 4


def test_order_explanations_include_real_task_rules_and_related_orders():
    start = datetime(2026, 9, 20, 8)
    task = SimpleNamespace(
        order_id='OID-1', order_key='JW-1', process='合绳', device='8304', batch=0,
        start=start, end=start + timedelta(hours=4),
        trace=[SimpleNamespace(rule='R2', text='合绳批次 1/1：4.0h', impact='8304'),
               SimpleNamespace(rule='R3', text='换型/上股准备 1h', impact='+1h')],
    )
    next_task = SimpleNamespace(
        order_id='OID-2', order_key='JW-2', process='合绳', device='8304', batch=0,
        start=start + timedelta(hours=5), end=start + timedelta(hours=8), trace=[],
    )
    order = SimpleNamespace(oid='OID-1', short_id='JW-1', delivery=start + timedelta(hours=10), tier=0)
    result = SimpleNamespace(tasks=[task, next_task], order_status={'OID-1': {'status': 'scheduled'}})

    explanations = build_order_explanations([order], result)

    item = explanations['JW-1']
    assert item['operations'][0]['device'] == '8304'
    assert item['operations'][0]['rules'][1]['rule'] == 'R3'
    assert item['operations'][0]['related_orders'] == ['JW-2']
    assert '换型时间' in item['operations'][0]['device_reason']
