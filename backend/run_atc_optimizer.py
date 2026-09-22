"""在未完成订单上搜索ATC紧迫度参数。"""
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
    classes_payload = json.loads((ROOT / 'results' / 'order_classification.json').read_text(encoding='utf-8'))
    classes = {row['订单号']: row['分类'] for row in classes_payload['明细']
               if row['分类'] != '已完成'}
    idx = CapacityIndex()
    average_hours = 178.3112  # 本批290张有效未完成订单理论最短工时中位数
    rows = []
    for k in (0.5, 1.0, 2.0):
        rows.append(run_candidate(
            f'ATC_k={k:g}',
            lambda order, feature, kk=k: atc_priority_key(
                order, feature[0], config.schedule_anchor, average_hours, kk
            ),
            classes, orders, config, idx,
        ))
    feasible = [row for row in rows if row['valid'] and row['scheduled_rate'] >= 0.999]
    best = min(feasible, key=lambda row: tuple(row['objective']))
    previous = json.loads((ROOT / 'results' / 'unfinished_optimizer_benchmark.json').read_text(encoding='utf-8'))['best_candidate']
    accepted = best if tuple(best['objective']) < tuple(previous['objective']) else previous
    payload = {
        'completed_filtered_out': len(all_orders) - len(orders),
        'unfinished_input_orders': len(orders),
        'previous_best': previous,
        'atc_candidates': rows,
        'accepted_best': accepted,
        'atc_improved_previous': accepted.get('name') != previous.get('name'),
    }
    output = ROOT / 'results' / 'atc_optimizer_benchmark.json'
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(output), 'accepted_best': accepted}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
