"""从当前目录构建并硬校验排程；退出码可供前端发布流水线使用。"""
from __future__ import annotations

import json
from pathlib import Path
import sys

from scheduler.bridge import CapacityIndex
from scheduler.config import ScheduleConfig
from scheduler.dataloader import load_orders
from scheduler.engine import Engine


def main() -> int:
    config = ScheduleConfig()
    orders = load_orders(schedule_anchor=config.schedule_anchor)
    engine = Engine(orders, CapacityIndex(), config)
    result = engine.run()
    payload = {
        'schedule_anchor': config.schedule_anchor.isoformat(),
        'kpi_horizon_end': config.horizon_end.isoformat(),
        'planning_end': result.planning_end.isoformat() if result.planning_end else None,
        'planning_cutoff': config.planning_end.isoformat() if config.planning_end else None,
        'orders_loaded': len(orders),
        'tasks': len(result.tasks),
        'manual_queue': len(result.manual),
        'exceptions': len(result.exceptions),
        'feasibility': result.feasibility,
        'validation': result.validation,
        'kpi': result.kpi,
        'algorithm': {
            'adaptive_batching': engine.adaptive_batching,
            'max_batch_attempts': engine.max_batch_attempts,
            'local_search': 'on_demand',
        },
    }
    output = Path(__file__).parent / 'results' / 'verified_schedule_summary.json'
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
    print(json.dumps(payload, ensure_ascii=False, default=str))
    return 0 if result.feasibility == 'feasible' else 2


if __name__ == '__main__':
    sys.exit(main())
