"""企业正式排程入口：未完成筛选、可行性分类、ATC与两阶段补排。"""
from datetime import datetime, timedelta
import statistics

from scheduler.atc_priority import atc_priority_key
from scheduler.bridge import CapacityIndex
from scheduler.config import ScheduleConfig
from scheduler.dataloader import load_orders
from scheduler.engine import Engine
from scheduler.two_stage import append_uncommitted_asap
from scheduler.urgency import estimate_min_chain_hours


def objective_settings(objective: str) -> tuple[str, float]:
    """将前端优化目标映射为真实的选机与ATC参数。"""
    mapping = {
        'on_time': ('fastest', 0.5),
        'balanced': ('balanced', 1.0),
        'utilization': ('least_loaded', 2.0),
    }
    if objective not in mapping:
        raise ValueError(f'未知优化目标：{objective}')
    return mapping[objective]


def visible_orders_as_of(orders, as_of: datetime):
    """按订单日期划分当时可见、未来与日期异常订单。"""
    visible, future, invalid = [], [], []
    for order in orders:
        if order.release_at is None:
            invalid.append(order)
        elif order.release_at <= as_of:
            visible.append(order)
        else:
            future.append(order)
    return visible, future, invalid


def build_official_schedule(orders_xlsx=None, rated_xlsx=None, config=None,
                            progress_callback=None, objective: str = 'balanced',
                            as_of: datetime | None = None):
    progress_callback = progress_callback or (lambda _percent, _stage: None)
    config = config or ScheduleConfig()
    as_of = as_of or config.schedule_anchor
    device_policy, atc_k = objective_settings(objective)
    progress_callback(15, '读取订单与产能')
    # 数据截止点只控制“哪些订单当时已经可见”；积压判定、剩余量截点与排产
    # 时间轴必须始终使用同一个生产基准，否则每切一周都会把历史状态重新定义。
    source_orders = load_orders(config.schedule_anchor, orders_xlsx=orders_xlsx)
    all_orders, future_orders, invalid_release_orders = visible_orders_as_of(
        source_orders, as_of)
    idx = CapacityIndex(rated_xlsx=rated_xlsx)
    engine = Engine(all_orders, idx, config, max_batch_attempts=3,
                    device_policy=device_policy)
    valid = [o for o in all_orders if not o.done and not o.flags
             and o.spec is not None and o.qty_m > 0]
    progress_callback(35, '评估订单物理可行性')
    hours = {}
    classifications = {}
    for order in valid:
        value = estimate_min_chain_hours(order, engine.match(order))
        hours[order.oid] = value or float('inf')
        if value is not None and order.delivery is not None \
                and config.schedule_anchor + timedelta(hours=value) <= order.delivery:
            classifications[order.oid] = '可抢救'
        else:
            classifications[order.oid] = '物理上暂不可准时'
    for order in all_orders:
        if order.flags:
            classifications[order.oid] = '数据待补'
    finite = [value for value in hours.values() if value != float('inf')]
    median_hours = statistics.median(finite) if finite else 24.0
    progress_callback(55, '计算ATC优先级')
    ranked = sorted(valid, key=lambda order: atc_priority_key(
        order, hours[order.oid], config.schedule_anchor, median_hours, atc_k
    ))
    engine.order_classifications = classifications
    engine.order_rank_overrides = {order.oid: index for index, order in enumerate(ranked)}
    progress_callback(72, '生成主排程')
    result = engine.run()
    progress_callback(88, '补排未承诺订单')
    def report_append(current, total, oid):
        ratio = current / total if total else 1.0
        percent = 88 + round(ratio * 7)
        suffix = f' · {oid}' if oid else ''
        progress_callback(percent, f'补排未承诺订单 {current}/{total}{suffix}')
    append_report = append_uncommitted_asap(engine, result, all_orders,
                                             config.schedule_anchor,
                                             progress_callback=report_append)
    progress_callback(96, '校验交期与约束')
    engine._finalize(result, valid)
    metadata = {
        'algorithm': f'ATC(k={atc_k})+classification+two-stage',
        'objective': objective,
        'device_policy': device_policy,
        'orders_total': len(all_orders),
        'completed_filtered': sum(order.done for order in all_orders),
        'unfinished_orders': sum(not order.done for order in all_orders),
        'valid_orders': len(valid),
        'manual_data_orders': sum(bool(order.flags) and not order.done for order in all_orders),
        'stage2_attempted': len(append_report.attempted),
        'stage2_appended': len(append_report.appended),
        'atc_k': atc_k,
        'processing_hours_median': median_hours,
        'source_orders_total': len(source_orders),
        'visible_orders': len(all_orders),
        'future_orders_filtered': len(future_orders),
        'invalid_order_date_orders': len(invalid_release_orders),
        'data_cutoff_at': as_of.isoformat(timespec='minutes'),
    }
    return engine, result, metadata
