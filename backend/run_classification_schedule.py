"""基于订单行动分类重构初始排程，并与EDD基线比较。"""
from __future__ import annotations

import json
from pathlib import Path
import time

from scheduler.bridge import CapacityIndex
from scheduler.config import ScheduleConfig
from scheduler.dataloader import load_orders
from scheduler.engine import Engine
from scheduler.two_stage import append_uncommitted_asap


ROOT = Path(__file__).parent


def metrics(result):
    current = result.kpi['kpi_scope']['current_window']
    future = result.kpi['kpi_scope']['future']
    return {
        'tasks': len(result.tasks),
        'manual_queue': len(result.manual),
        'risk_orders': result.kpi['risk_orders'],
        'scheduled_rate': result.kpi['scheduled_rate'],
        'current_on_time': current['strict_on_time_orders'],
        'current_total': current['orders'],
        'future_on_time': future['strict_on_time_orders'],
        'future_total': future['orders'],
        'all_fresh_on_time': current['strict_on_time_orders'] + future['strict_on_time_orders'],
        'planning_end': result.planning_end.isoformat() if result.planning_end else None,
        'changeover_hours': result.changeover_hours,
        'validation': result.validation,
    }


def main():
    classes_payload = json.loads((ROOT / 'results' / 'order_classification.json').read_text(encoding='utf-8'))
    classifications = {row['订单号']: row['分类'] for row in classes_payload['明细']}
    baseline_payload = json.loads((ROOT / 'results' / 'verified_schedule_summary.json').read_text(encoding='utf-8'))
    baseline_scope = baseline_payload['kpi']['kpi_scope']
    baseline = {
        'tasks': baseline_payload['tasks'],
        'manual_queue': baseline_payload['manual_queue'],
        'risk_orders': baseline_payload['kpi']['risk_orders'],
        'scheduled_rate': baseline_payload['kpi']['scheduled_rate'],
        'current_on_time': baseline_scope['current_window']['strict_on_time_orders'],
        'current_total': baseline_scope['current_window']['orders'],
        'future_on_time': baseline_scope['future']['strict_on_time_orders'],
        'future_total': baseline_scope['future']['orders'],
        'all_fresh_on_time': (baseline_scope['current_window']['strict_on_time_orders']
                              + baseline_scope['future']['strict_on_time_orders']),
        'planning_end': baseline_payload['planning_end'],
        'validation': baseline_payload['validation'],
    }

    config = ScheduleConfig()
    orders = load_orders(config.schedule_anchor)
    engine = Engine(orders, CapacityIndex(), config)
    engine.order_classifications = classifications
    started = time.perf_counter()
    result = engine.run()
    elapsed = time.perf_counter() - started
    stage1 = metrics(result)
    protected_ids = {oid for oid, status in result.order_status.items()
                     if status.get('status') == 'scheduled'}
    protected_signature = sorted(
        (task.order_id, task.process, task.batch, task.device,
         task.start.isoformat(), task.end.isoformat())
        for task in result.tasks if task.order_id in protected_ids
    )
    append_report = append_uncommitted_asap(
        engine, result, orders, config.schedule_anchor
    )
    active = [order for order in orders if not order.done and order.spec is not None
              and order.qty_m > 0 and not order.flags]
    engine._finalize(result, active)
    optimized = metrics(result)
    protected_after = sorted(
        (task.order_id, task.process, task.batch, task.device,
         task.start.isoformat(), task.end.isoformat())
        for task in result.tasks if task.order_id in protected_ids
    )
    payload = {
        'method': 'P0 -> 已准时保护 -> 可抢救(EDD) -> 物理上暂不可准时(EDD)',
        'assumption': '暂未考虑在制、半成品、库存和部分交付，按全量剩余计算',
        'runtime_seconds': round(elapsed, 3),
        'baseline_edd': baseline,
        'stage1_classification_schedule': stage1,
        'stage2_append_schedule': optimized,
        'stage2_append_report': {
            'attempted': len(append_report.attempted),
            'appended': len(append_report.appended),
            'failed': len(append_report.failed),
            'failed_order_ids': append_report.failed,
            'protected_orders': len(protected_ids),
            'protected_tasks_unchanged': protected_signature == protected_after,
        },
        'delta': {
            'current_on_time': optimized['current_on_time'] - baseline['current_on_time'],
            'future_on_time': optimized['future_on_time'] - baseline['future_on_time'],
            'all_fresh_on_time': optimized['all_fresh_on_time'] - baseline['all_fresh_on_time'],
            'risk_orders': optimized['risk_orders'] - baseline['risk_orders'],
        },
    }
    output = ROOT / 'results' / 'classification_schedule_benchmark.json'
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == '__main__':
    main()
