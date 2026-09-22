from datetime import datetime

from scheduler.dataloader import Order, load_orders
from scheduler.policies import DelayPolicy
import pandas as pd


def test_order_defaults_to_non_delayable():
    order = Order('A1', '钢丝绳', '6x19-10', None, 10, 20, datetime(2026, 9, 10), False, False)
    assert order.delay_policy.code == 'hard'
    assert order.delay_tolerance_hours == 0
    assert order.policy_confirmed is False


def test_enterprise_policy_populates_white_box_fields():
    policy = DelayPolicy('tolerant_72h', 72, 'enterprise_import', '客户同意', True)
    order = Order('A1', '钢丝绳', '6x19-10', None, 10, 20, datetime(2026, 9, 10), False, False,
                  delay_policy=policy)
    assert order.delay_tolerance_hours == 72
    assert order.policy_confirmed is True


def test_loader_uses_enterprise_sales_rows_for_remaining_quantity(monkeypatch):
    frame = pd.DataFrame([{
        '内部订单单号-序号-次序号': 'A1', '规格': '6*19S+FC-10mm', '结束码': '未结束',
        '业务数量': 1000, '计价数量': 2400, '预发货日': datetime(2026, 9, 10),
        '预到货日': None, '品名': '钢丝绳', '最后销货日期': datetime(2026, 9, 5),
    }])
    monkeypatch.setattr(pd, 'read_excel', lambda *args, **kwargs: frame)
    orders = __import__('scheduler.dataloader', fromlist=['load_orders']).load_orders(
        schedule_anchor=datetime(2026, 9, 6),
        sales_rows={'A1': [{'sale_at': datetime(2026, 9, 5), 'qty_m': 400, 'qty_kg': 960}]},
    )
    assert (orders[0].qty_m, orders[0].qty_kg) == (600, 1440)
    assert orders[0].remaining_status == 'ready'


def test_loader_flags_partial_sale_date_when_quantity_detail_is_missing(monkeypatch):
    frame = pd.DataFrame([{
        '内部订单单号-序号-次序号': 'A1', '规格': '6*19S+FC-10mm', '结束码': '未结束',
        '业务数量': 1000, '计价数量': 2400, '预发货日': datetime(2026, 9, 10),
        '预到货日': None, '品名': '钢丝绳', '最后销货日期': datetime(2026, 9, 5),
    }])
    monkeypatch.setattr(pd, 'read_excel', lambda *args, **kwargs: frame)
    orders = __import__('scheduler.dataloader', fromlist=['load_orders']).load_orders(
        schedule_anchor=datetime(2026, 9, 6), sales_rows={})
    assert '销货数量明细缺失' in orders[0].flags
    assert orders[0].remaining_status == 'sales_quantity_required'


def _dated_order_frame(order_date):
    return pd.DataFrame([{
        '内部订单单号-序号-次序号': 'A1', '规格': '6*19S+FC-10mm', '结束码': '未结束',
        '业务数量': 1000, '计价数量': 2400, '预发货日': datetime(2026, 9, 10),
        '预到货日': None, '品名': '钢丝绳', '最后销货日期': None,
        '订单日期': order_date, '单据日期': datetime(2026, 8, 7),
    }])


def test_loader_uses_order_date_as_release_at_even_when_document_date_is_earlier(monkeypatch):
    monkeypatch.setattr(pd, 'read_excel', lambda *args, **kwargs:
                        _dated_order_frame(datetime(2026, 8, 10, 15, 30)))

    order = load_orders(schedule_anchor=datetime(2026, 8, 3))[0]

    assert order.release_at == datetime(2026, 8, 10)


def test_loader_flags_missing_order_date_instead_of_using_document_date(monkeypatch):
    monkeypatch.setattr(pd, 'read_excel', lambda *args, **kwargs:
                        _dated_order_frame(pd.NaT))

    order = load_orders(schedule_anchor=datetime(2026, 8, 3))[0]

    assert order.release_at is None
    assert '订单日期缺失' in order.flags
