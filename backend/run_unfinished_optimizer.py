"""仅对未完成订单运行分类、瓶颈与条件替换候选搜索。"""
from __future__ import annotations

import json
from pathlib import Path
import time

from scheduler.bridge import CapacityIndex
from scheduler.config import ScheduleConfig
from scheduler.dataloader import load_orders
from scheduler.engine import Engine
from scheduler.objective import evaluate_objective
from scheduler.two_stage import append_uncommitted_asap
from scheduler.urgency import estimate_min_chain_hours


ROOT = Path(__file__).parent


def result_metrics(result, valid_orders):
    current = result.kpi['kpi_scope']['current_window']
    future = result.kpi['kpi_scope']['future']
    evaluation = evaluate_objective(
        valid_orders, result.order_status, result.tasks,
        result.changeover_hours,
        max(result.device_util.values(), default=0) - min(result.device_util.values(), default=0),
    )
    return {
        'strict_on_time_non_backlog': current['strict_on_time_orders'] + future['strict_on_time_orders'],
        'current_on_time': current['strict_on_time_orders'],
        'future_on_time': future['strict_on_time_orders'],
        'scheduled_rate': result.kpi['scheduled_rate'],
        'manual_queue': len(result.manual),
        'risk_orders': result.kpi['risk_orders'],
        'late_hours': evaluation.vector.late_hours,
        'changeover_hours': result.changeover_hours,
        'planning_end': result.planning_end.isoformat(),
        'objective': list(evaluation.vector.__dict__.values()),
        'valid': result.validation['valid'],
        'violations': result.validation['violations'],
    }


def run_candidate(name, key_builder, base_classes, orders, config, idx,
                  engine_kwargs=None):
    engine = Engine(orders, idx, config, **(engine_kwargs or {}))
    valid = [o for o in orders if not o.done and not o.flags and o.spec is not None and o.qty_m > 0]
    features = {}
    for order in valid:
        matched = engine.match(order)
        hours = estimate_min_chain_hours(order, matched) or float('inf')
        scarcity = min(len(matched.wire_devs), len(matched.strand_rows), len(matched.rope_rows))
        features[order.oid] = (hours, scarcity)

    # 条件替换：原准时订单与可抢救订单同池竞争；P0仍由引擎保持最高。
    classes = dict(base_classes)
    for oid, category in list(classes.items()):
        if category == '已准时保护':
            classes[oid] = '可抢救'
    engine.order_classifications = classes
    ranked = sorted(valid, key=lambda o: key_builder(o, features[o.oid]))
    engine.order_rank_overrides = {o.oid: i for i, o in enumerate(ranked)}
    started = time.perf_counter()
    result = engine.run()
    stage1_on_time = (result.kpi['kpi_scope']['current_window']['strict_on_time_orders']
                      + result.kpi['kpi_scope']['future']['strict_on_time_orders'])
    appended = append_uncommitted_asap(engine, result, orders, config.schedule_anchor)
    engine._finalize(result, valid)
    elapsed = time.perf_counter() - started
    row = result_metrics(result, valid)
    row.update({
        'name': name,
        'runtime_seconds': round(elapsed, 3),
        'stage1_on_time': stage1_on_time,
        'stage2_attempted': len(appended.attempted),
        'stage2_appended': len(appended.appended),
    })
    print(json.dumps({'candidate': name, 'metrics': row}, ensure_ascii=False), flush=True)
    return row


def main():
    config = ScheduleConfig()
    all_orders = load_orders(config.schedule_anchor)
    orders = [order for order in all_orders if not order.done]
    classes_payload = json.loads((ROOT / 'results' / 'order_classification.json').read_text(encoding='utf-8'))
    base_classes = {row['订单号']: row['分类'] for row in classes_payload['明细']
                    if row['分类'] != '已完成'}
    idx = CapacityIndex()
    policies = [
        ('可抢救短工时优先', lambda o, f: (f[0], o.delivery, -o.qty_m)),
        ('交期日内短工时优先', lambda o, f: (o.delivery.date() if o.delivery else None, f[0], -o.qty_m)),
        ('瓶颈稀缺设备优先', lambda o, f: (f[1], o.delivery, f[0], -o.qty_m)),
    ]
    rows = [run_candidate(name, key, base_classes, orders, config, idx)
            for name, key in policies]
    feasible = [row for row in rows if row['valid'] and row['scheduled_rate'] >= 0.999]
    best = min(feasible, key=lambda row: tuple(row['objective'])) if feasible else None
    payload = {
        'input_orders_total': len(all_orders),
        'completed_filtered_out': len(all_orders) - len(orders),
        'unfinished_input_orders': len(orders),
        'acceptance': '字典序严格改善且排产覆盖率不低于99.9%、硬约束零违规',
        'candidates': rows,
        'best_candidate': best,
    }
    output = ROOT / 'results' / 'unfinished_optimizer_benchmark.json'
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(output), 'best': best}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
