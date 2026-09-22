"""在ATC k=1顺序上联合搜索拆批深度与设备选择策略。"""
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
    average_hours = 178.3112
    key = lambda order, feature: atc_priority_key(
        order, feature[0], config.schedule_anchor, average_hours, 1.0
    )
    variants = [
        ('ATC_全拆批_均衡选机', {'max_batch_attempts': 7, 'device_policy': 'balanced'}),
        ('ATC_全拆批_最快设备', {'max_batch_attempts': 7, 'device_policy': 'fastest'}),
        ('ATC_全拆批_最低负荷', {'max_batch_attempts': 7, 'device_policy': 'least_loaded'}),
    ]
    rows = [run_candidate(name, key, classes, orders, config, idx, kwargs)
            for name, kwargs in variants]
    previous = json.loads((ROOT / 'results' / 'atc_optimizer_benchmark.json').read_text(encoding='utf-8'))['accepted_best']
    feasible = [row for row in rows if row['valid'] and row['scheduled_rate'] >= 0.999]
    best_new = min(feasible, key=lambda row: tuple(row['objective']))
    accepted = best_new if tuple(best_new['objective']) < tuple(previous['objective']) else previous
    payload = {
        'completed_filtered_out': len(all_orders) - len(orders),
        'unfinished_input_orders': len(orders),
        'baseline_atc_k1': previous,
        'joint_candidates': rows,
        'accepted_best': accepted,
        'joint_search_improved': accepted.get('name') != previous.get('name'),
    }
    output = ROOT / 'results' / 'device_batch_optimizer_benchmark.json'
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(output), 'accepted_best': accepted}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
