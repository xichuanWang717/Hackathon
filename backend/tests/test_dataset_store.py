from pathlib import Path

import pandas as pd

from scheduler.dataset_store import validate_core_workbooks


def test_core_workbooks_report_completed_and_unfinished_counts(tmp_path):
    orders = tmp_path / '订单信息.xlsx'
    rated = tmp_path / '产品额定.xlsx'
    pd.DataFrame([
        {'内部订单单号-序号-次序号': 'A', '规格': '8mm 6*19S+FC', '业务数量': 1,
         '计价数量': 2, '预发货日': '2026-09-10', '结束码': '已结束', '品名': '绳'},
        {'内部订单单号-序号-次序号': 'B', '规格': '8mm 6*19S+FC', '业务数量': 1,
         '计价数量': 2, '预发货日': '2026-09-11', '结束码': '未结束', '品名': '绳'},
    ]).to_excel(orders, sheet_name='订单信息', index=False)
    with pd.ExcelWriter(rated) as writer:
        pd.DataFrame({'设备编号': [1]}).to_excel(writer, sheet_name='拉丝', index=False)
        pd.DataFrame({'品名': ['x']}).to_excel(writer, sheet_name='捻股', index=False)
        pd.DataFrame({'规格': ['x']}).to_excel(writer, sheet_name='合绳（绳子+绳芯）', index=False)

    report = validate_core_workbooks(orders, rated)

    assert report['valid'] is True
    assert report['summary']['orders_total'] == 2
    assert report['summary']['completed_orders'] == 1
    assert report['summary']['unfinished_orders'] == 1
    assert report['completed_order_details'] == [{
        'order_id': 'A',
        'product_name': '绳',
        'spec': '8mm 6*19S+FC',
        'due_date': '2026-09-10',
        'finish_code': '已结束',
        'reason': '订单信息 Sheet 的“结束码”为“已结束”，属于历史已完结订单，不再安排剩余工序',
    }]


def test_missing_required_order_column_is_an_error(tmp_path):
    orders = tmp_path / 'bad.xlsx'
    rated = tmp_path / 'rated.xlsx'
    pd.DataFrame([{'订单号': 'A'}]).to_excel(orders, sheet_name='订单信息', index=False)
    with pd.ExcelWriter(rated) as writer:
        for name in ('拉丝', '捻股', '合绳（绳子+绳芯）'):
            pd.DataFrame({'x': [1]}).to_excel(writer, sheet_name=name, index=False)

    report = validate_core_workbooks(orders, rated)

    assert report['valid'] is False
    assert any('缺少字段' in item for item in report['errors'])
