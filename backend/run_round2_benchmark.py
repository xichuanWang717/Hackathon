"""第一版与第二轮算法在同一数据口径下的可复现对照。"""
from __future__ import annotations

import json
from pathlib import Path
import time

from scheduler.bridge import CapacityIndex
from scheduler.config import ScheduleConfig
from scheduler.dataloader import load_orders
from scheduler.engine import Engine


def build_benchmark_record(name, result, runtime_seconds: float) -> dict:
    current = result.kpi['kpi_scope']['current_window']
    return {
        'name': name,
        'runtime_seconds': round(runtime_seconds, 3),
        'tasks': len(result.tasks),
        'manual_queue': len(result.manual),
        'exceptions': len(result.exceptions),
        'valid': result.validation.get('valid', False),
        'violations': result.validation.get('violations', []),
        'feasibility': result.feasibility,
        'current_window': {
            'denominator': current['denominator'],
            'strict_on_time_orders': current['strict_on_time_orders'],
            'explicit_late_orders': current['explicit_late_orders'],
            'uncommitted_orders': current['uncommitted_orders'],
        },
        'strict_on_time_rate': result.kpi['strict_on_time_rate'],
        'explicit_late_rate': result.kpi['explicit_late_rate'],
        'uncommitted_rate': result.kpi['uncommitted_rate'],
        'scheduled_rate': result.kpi.get('scheduled_rate', 0),
        'changeover_hours': result.changeover_hours,
    }


def run_variant(name: str, adaptive_batching: bool, horizon_days: int = 14):
    config = ScheduleConfig(horizon_days=horizon_days)
    orders = load_orders(config.schedule_anchor)
    engine = Engine(orders, CapacityIndex(), config,
                    adaptive_batching=adaptive_batching)
    started = time.perf_counter()
    result = engine.run()
    elapsed = time.perf_counter() - started
    return build_benchmark_record(name, result, elapsed), result


def main():
    baseline, _ = run_variant('round1_same_data_scope', False)
    round2, _ = run_variant('round2_adaptive_batching', True)
    payload = {
        'data_scope_note': '两方案均使用相同剩余量保护和KPI分母；差异仅来自算法。',
        'variants': [baseline, round2],
    }
    output = Path(__file__).parent / 'results' / 'round2_benchmark.json'
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == '__main__':
    main()
