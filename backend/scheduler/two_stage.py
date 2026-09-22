"""两阶段排程：保留第一阶段任务，仅追加数据完整的未承诺订单。"""
from dataclasses import dataclass, field


@dataclass
class AppendReport:
    attempted: list[str] = field(default_factory=list)
    appended: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)


def append_uncommitted_asap(engine, result, orders, anchor,
                            progress_callback=None) -> AppendReport:
    progress_callback = progress_callback or (lambda _current, _total, _oid: None)
    report = AppendReport()
    by_id = {order.oid: order for order in orders}
    retry_ids = []
    for row in result.manual:
        oid = row.get('order_id')
        order = by_id.get(oid)
        if (order is not None and not order.done and not order.flags
                and order.spec is not None and order.qty_m > 0):
            retry_ids.append(oid)

    total = len(retry_ids)
    progress_callback(0, total, '')
    for current, oid in enumerate(retry_ids, start=1):
        order = by_id[oid]
        report.attempted.append(oid)
        result.manual = [row for row in result.manual if row.get('order_id') != oid]
        engine._schedule_order(order, result, now=anchor, backlog=True)
        if result.order_status.get(oid, {}).get('status') in {'scheduled', 'exception'}:
            report.appended.append(oid)
        else:
            report.failed.append(oid)
            # 排程函数应写回失败原因；兜底确保人工队列仍有且仅有一条。
            rows = [row for row in result.manual if row.get('order_id') == oid]
            if not rows:
                result.manual.append({'order_id': oid, 'reason': '第二阶段追加失败'})
            elif len(rows) > 1:
                keep = rows[-1]
                result.manual = [row for row in result.manual if row.get('order_id') != oid]
                result.manual.append(keep)
        progress_callback(current, total, oid)
    return report
