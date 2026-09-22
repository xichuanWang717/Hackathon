"""口径明确的履约指标；未排入订单留在分母内。"""


def classify_kpi_scope(order, anchor, horizon_end):
    if order.delivery is None:
        return 'unscoped'
    if order.delivery.date() < anchor.date():
        return 'backlog'
    if order.delivery.date() <= horizon_end.date():
        return 'current_window'
    return 'future'


def compute_scoped_kpis(orders, order_status, anchor, horizon_end) -> dict:
    buckets = {
        name: {'orders': 0, 'strict_on_time_orders': 0, 'explicit_late_orders': 0,
               'uncommitted_orders': 0, 'commitment_met_orders': 0}
        for name in ('current_window', 'backlog', 'future', 'unscoped')
    }
    for order in orders:
        bucket = buckets[classify_kpi_scope(order, anchor, horizon_end)]
        bucket['orders'] += 1
        status = order_status.get(order.oid, {})
        state = status.get('status', 'manual')
        if state == 'scheduled':
            bucket['strict_on_time_orders'] += 1
            bucket['commitment_met_orders'] += 1
        elif state == 'exception':
            bucket['explicit_late_orders'] += 1
            tolerance = float(getattr(order, 'delay_tolerance_hours', 0) or 0)
            if status.get('margin_h', float('-inf')) >= -tolerance:
                bucket['commitment_met_orders'] += 1
        else:
            bucket['uncommitted_orders'] += 1

    for bucket in buckets.values():
        denominator = bucket['orders']
        bucket['denominator'] = denominator
        bucket['strict_on_time_rate'] = (
            bucket['strict_on_time_orders'] / denominator if denominator else 0.0)
        bucket['explicit_late_rate'] = (
            bucket['explicit_late_orders'] / denominator if denominator else 0.0)
        bucket['uncommitted_rate'] = (
            bucket['uncommitted_orders'] / denominator if denominator else 0.0)
        bucket['commitment_met_rate'] = (
            bucket['commitment_met_orders'] / denominator if denominator else 0.0)

    current = buckets['current_window']
    return {
        'kpi_scope': buckets,
        'strict_on_time_rate': current['strict_on_time_rate'],
        'explicit_late_rate': current['explicit_late_rate'],
        'uncommitted_rate': current['uncommitted_rate'],
        'commitment_met_rate': current['commitment_met_rate'],
        'eligible_orders': current['denominator'],
        'backlog_summary': buckets['backlog'],
        'future_order_summary': buckets['future'],
    }


def compute_kpis(rows) -> dict:
    eligible = len(rows)
    strict = 0
    commitment = 0
    for row in rows:
        completed = row.get('completed_at')
        if completed is None:
            continue
        due = row['due']
        if completed <= due:
            strict += 1
        tolerance = float(row.get('tolerance_hours', 0) or 0)
        if (completed - due).total_seconds() <= tolerance * 3600:
            commitment += 1
    denominator = eligible or 1
    return {
        'eligible_orders': eligible,
        'strict_on_time_orders': strict,
        'commitment_met_orders': commitment,
        'strict_on_time_rate': strict / denominator if eligible else 0.0,
        'commitment_met_rate': commitment / denominator if eligible else 0.0,
    }
