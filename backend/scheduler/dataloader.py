# -*- coding: utf-8 -*-
"""订单数据加载与清洗。"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta

import pandas as pd

from scheduler import config as C
from scheduler.bridge import Spec, parse_spec
from scheduler.policies import DelayPolicy, parse_delay_policy_row
from scheduler.remaining import compute_remaining_quantity


@dataclass
class Order:
    oid: str                   # 内部订单单号
    name: str                  # 品名
    spec_raw: str
    spec: Spec | None
    qty_m: float               # 业务数量（米）
    qty_kg: float              # 计价数量（kg）
    delivery: datetime | None  # 交期
    done: bool                 # 已结束
    backlog: bool              # 积压（交期 < 基准日）
    tier: int = 2              # 0 紧急 / 1 超时 / 2 普通 / 3 积压
    short_id: str = ''         # 前端展示短号（空则按 oid 推导）
    flags: list = field(default_factory=list)   # 数据问题标注
    release_at: datetime | None = None
    remaining_qty_m: float | None = None
    remaining_qty_kg: float | None = None
    delay_policy: DelayPolicy = field(default_factory=DelayPolicy)
    delay_tolerance_hours: int = field(init=False)
    policy_confirmed: bool = field(init=False)
    original_qty_m: float | None = None
    original_qty_kg: float | None = None
    remaining_status: str = 'original_quantity'
    remaining_quantity_trace: tuple = field(default_factory=tuple)

    def __post_init__(self):
        self.delay_tolerance_hours = self.delay_policy.tolerance_hours
        self.policy_confirmed = self.delay_policy.confirmed
        if not self.short_id:
            try:
                parts = self.oid.split('-')
                self.short_id = f'JW-{parts[1][4:8]}-{parts[2]}'
            except Exception:
                self.short_id = self.oid[-10:]


def load_orders(schedule_anchor: datetime | None = None, policy_by_order=None,
                remaining_by_order=None, sales_rows=None,
                orders_xlsx: str | None = None) -> list[Order]:
    schedule_anchor = schedule_anchor or C.BASELINE
    policy_by_order = policy_by_order or {}
    remaining_by_order = remaining_by_order or {}
    sales_rows = sales_rows or {}
    df = pd.read_excel(orders_xlsx or C.ORDERS_XLSX, sheet_name='订单信息')
    orders: list[Order] = []
    for _, r in df.iterrows():
        oid = str(r['内部订单单号-序号-次序号']).strip()
        spec_raw = str(r['规格']).strip()
        done = str(r['结束码']).strip() == '已结束'
        qty_m = float(r['业务数量']) if pd.notna(r['业务数量']) else 0.0
        qty_kg = float(r['计价数量']) if pd.notna(r['计价数量']) else 0.0
        original_qty_m, original_qty_kg = qty_m, qty_kg
        delivery = r['预发货日']
        if pd.isna(delivery):
            delivery = r['预到货日']
        if pd.isna(delivery):
            delivery = None
        else:
            delivery = pd.Timestamp(delivery).to_pydatetime().replace(hour=0, minute=0)
        order_date = r.get('订单日期')
        if pd.isna(order_date):
            release_at = None
        else:
            release_at = pd.Timestamp(order_date).to_pydatetime().replace(
                hour=0, minute=0, second=0, microsecond=0)
        spec = parse_spec(spec_raw)
        flags = []
        if release_at is None:
            flags.append('订单日期缺失')
        if spec is None:
            flags.append('规格无法解析')
        if qty_m <= 0:
            flags.append('数量缺失(米)')
        if qty_kg <= 0:
            flags.append('数量缺失(kg)')
        if delivery is None:
            flags.append('交期缺失')
        remaining_status = 'original_quantity'
        remaining_trace = ()
        order_sales = sales_rows.get(oid)
        last_sale = r.get('最后销货日期')
        if order_sales:
            remaining_result = compute_remaining_quantity(
                qty_m, qty_kg, order_sales,
                schedule_anchor - timedelta(seconds=1),
            )
            remaining_status = remaining_result.status
            remaining_trace = remaining_result.trace
            if remaining_result.status == 'ready':
                qty_m = remaining_result.remaining_m
                qty_kg = remaining_result.remaining_kg
            else:
                flags.append(f'剩余数量待确认:{remaining_result.status}')
        elif not done and pd.notna(last_sale):
            remaining_status = 'sales_quantity_required'
            flags.append('销货数量明细缺失')
        backlog = (delivery is not None and delivery < schedule_anchor)
        policy = parse_delay_policy_row(policy_by_order.get(oid))
        remaining = remaining_by_order.get(oid, {})
        remaining_m = remaining.get('qty_m')
        remaining_kg = remaining.get('qty_kg')
        if remaining_m is not None:
            qty_m = float(remaining_m)
        if remaining_kg is not None:
            qty_kg = float(remaining_kg)
        orders.append(Order(oid=oid, name=str(r['品名']).strip(), spec_raw=spec_raw,
                            spec=spec, qty_m=qty_m, qty_kg=qty_kg,
                            delivery=delivery, done=done, backlog=backlog,
                            flags=flags, release_at=release_at,
                            remaining_qty_m=remaining_m,
                            remaining_qty_kg=remaining_kg, delay_policy=policy,
                            original_qty_m=original_qty_m, original_qty_kg=original_qty_kg,
                            remaining_status=remaining_status,
                            remaining_quantity_trace=remaining_trace))
    # 优先级分层：积压(3) > 普通(2)；超时(1)/紧急(0) 由人工/插单触发
    for o in orders:
        if o.backlog:
            o.tier = C.BACKLOG_TIER
    return orders
