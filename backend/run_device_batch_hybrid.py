"""最低负荷选机的收敛试验：限制拆批候选，避免过度拆批。"""
import json
from pathlib import Path

from scheduler.atc_priority import atc_priority_key
from scheduler.bridge import CapacityIndex
from scheduler.config import ScheduleConfig
from scheduler.dataloader import load_orders
from run_unfinished_optimizer import run_candidate


ROOT = Path(__file__).parent


def main():
    config = ScheduleConfig()
    all_orders = load_orders(config.schedule_anchor)
    orders = [order for order in all_orders if not order.done]
    payload = json.loads((ROOT / 'results' / 'order_classification.json').read_text(encoding='utf-8'))
    classes = {row['订单号']: row['分类'] for row in payload['明细'] if row['分类'] != '已完成'}
    key = lambda order, feature: atc_priority_key(
        order, feature[0], config.schedule_anchor, 178.3112, 1.0
    )
    row = run_candidate(
        'ATC_三拆批_最低负荷', key, classes, orders, config, CapacityIndex(),
        {'max_batch_attempts': 3, 'device_policy': 'least_loaded'},
    )
    previous = json.loads((ROOT / 'results' / 'atc_optimizer_benchmark.json').read_text(encoding='utf-8'))['accepted_best']
    accepted = row if (row['valid'] and row['scheduled_rate'] >= 0.999
                       and tuple(row['objective']) < tuple(previous['objective'])) else previous
    output_payload = {'baseline': previous, 'candidate': row, 'accepted_best': accepted}
    output = ROOT / 'results' / 'device_batch_hybrid_benchmark.json'
    output.write_text(json.dumps(output_payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(output), 'accepted_best': accepted}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
