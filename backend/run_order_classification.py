"""生成订单行动分类明细，供调度优化和Excel展示使用。"""
from __future__ import annotations

from collections import Counter
from datetime import timedelta
import json
from pathlib import Path

from scheduler.bridge import CapacityIndex
from scheduler.config import ScheduleConfig
from scheduler.dataloader import load_orders
from scheduler.engine import Engine
from scheduler.order_classification import classify_order
from scheduler.urgency import estimate_min_chain_hours


def main():
    config = ScheduleConfig()
    orders = load_orders(schedule_anchor=config.schedule_anchor)
    engine = Engine(orders, CapacityIndex(), config)
    result = engine.run()
    rope_ends = {}
    for task in result.tasks:
        if task.process == '合绳':
            rope_ends[task.order_id] = max(rope_ends.get(task.order_id, task.end), task.end)

    rows = []
    for order in orders:
        matched = None if order.spec is None else engine.match(order)
        min_hours = (estimate_min_chain_hours(order, matched)
                     if matched is not None else None)
        status = result.order_status.get(order.oid, {})
        category = classify_order(order, min_hours, status, config.schedule_anchor)
        isolated_finish = (config.schedule_anchor + timedelta(hours=min_hours)
                           if min_hours is not None else None)
        scope = ('已完成' if order.done else
                 '交期缺失' if order.delivery is None else
                 '历史积压' if order.delivery < config.schedule_anchor else
                 '近期14天' if order.delivery <= config.horizon_end else '未来订单')
        if category == '已准时保护':
            action = '锁定当前可行链；后续调整不得使其超期'
        elif category == '可抢救':
            action = '进入LNS候选池：交换顺序、换机、合批或拆批'
        elif category == '物理上暂不可准时':
            action = '给出最早交付；补充在制、库存和剩余数量后重算'
        elif category == '数据待补':
            action = '补齐或确认数据后重新分类'
        else:
            action = '不再排产'
        rows.append({
            '订单号': order.oid,
            '短订单号': order.short_id,
            '品名': order.name,
            '规格': order.spec_raw,
            '原订单数量_米': order.original_qty_m,
            '当前计算数量_米': order.qty_m,
            '原始预发货日': order.delivery.isoformat() if order.delivery else None,
            '订单范围': scope,
            '分类': category,
            '理论最短工艺时间_小时': round(min_hours, 2) if min_hours is not None else None,
            '空车间理论最早完工': isolated_finish.isoformat() if isolated_finish else None,
            '当前排程预计完工': rope_ends.get(order.oid).isoformat() if order.oid in rope_ends else None,
            '当前交期余量_小时': round(status.get('margin_h'), 2) if status.get('margin_h') is not None else None,
            '当前排程状态': status.get('status', 'done' if order.done else 'unclassified'),
            '数据问题': '；'.join(order.flags),
            '建议动作': action,
        })

    counts = Counter(row['分类'] for row in rows)
    payload = {
        '口径': {
            '排程基准': config.schedule_anchor.isoformat(),
            '近期KPI终点': config.horizon_end.isoformat(),
            '在制库存假设': '暂未提供，保守按尚未投产、全量剩余计算',
            '分类规则': '已准时保护/可抢救/物理上暂不可准时/数据待补；已完成单列',
        },
        '汇总': dict(counts),
        '订单总数': len(rows),
        '硬约束校验': result.validation,
        '明细': rows,
    }
    output = Path(__file__).parent / 'results' / 'order_classification.json'
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'汇总': payload['汇总'], '订单总数': len(rows)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
