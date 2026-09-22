"""隔离运行三种交期日内截止时刻；不覆盖正式排程结果。"""
from __future__ import annotations

from datetime import time
import json
from pathlib import Path
import time as clock

from scheduler.bridge import CapacityIndex
from scheduler.config import ScheduleConfig
from scheduler.dataloader import load_orders
from scheduler.engine import Engine
from scheduler.time_validation import apply_cutoff_to_orders


CUTOFFS = {'00:00': time(0, 0), '17:30': time(17, 30), '23:59': time(23, 59)}


def summarize(name, result, elapsed):
    current = result.kpi['kpi_scope']['current_window']
    late_hours = sum(max(0.0, -float(status.get('margin_h', 0) or 0))
                     for status in result.order_status.values()
                     if status.get('status') == 'exception')
    return {
        'cutoff': name,
        'mode': 'static',
        'denominator': current['denominator'],
        'strict_on_time_orders': current['strict_on_time_orders'],
        'strict_on_time_rate': current['strict_on_time_rate'],
        'explicit_late_orders': current['explicit_late_orders'],
        'uncommitted_orders': current['uncommitted_orders'],
        'late_hours_all_scopes': round(late_hours, 2),
        'tasks': len(result.tasks),
        'changeover_hours': result.changeover_hours,
        'valid': result.validation['valid'],
        'violations': len(result.validation['violations']),
        'runtime_seconds': round(elapsed, 3),
    }


def run_static_experiments():
    config = ScheduleConfig()
    source = load_orders(config.schedule_anchor)
    rows = []
    for name, cutoff in CUTOFFS.items():
        orders = apply_cutoff_to_orders(source, cutoff)
        engine = Engine(orders, CapacityIndex(), config)
        started = clock.perf_counter()
        result = engine.run()
        rows.append(summarize(name, result, clock.perf_counter() - started))
    denominators = {row['denominator'] for row in rows}
    if len(denominators) != 1:
        raise RuntimeError(f'实验分母不一致：{sorted(denominators)}')
    return rows


def main():
    payload = {'static': run_static_experiments(), 'rolling': []}
    output = Path(__file__).parent / 'results' / 'time_cutoff_validation.json'
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == '__main__':
    main()
