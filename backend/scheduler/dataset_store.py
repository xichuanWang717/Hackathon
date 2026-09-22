"""企业核心Excel的只读校验与版本元数据。"""
from pathlib import Path

import pandas as pd


ORDER_REQUIRED = {
    '内部订单单号-序号-次序号', '规格', '业务数量', '计价数量', '结束码', '品名'
}
RATED_SHEETS = {'拉丝', '捻股', '合绳（绳子+绳芯）'}


def validate_core_workbooks(orders_path: Path, rated_path: Path) -> dict:
    errors, warnings = [], []
    try:
        order_book = pd.ExcelFile(orders_path)
        if '订单信息' not in order_book.sheet_names:
            errors.append('订单文件缺少“订单信息”Sheet')
            order_frame = pd.DataFrame()
        else:
            order_frame = pd.read_excel(orders_path, sheet_name='订单信息')
            missing = sorted(ORDER_REQUIRED - set(order_frame.columns))
            if missing:
                errors.append('订单信息缺少字段：' + '、'.join(missing))
            if not ({'预发货日', '预到货日'} & set(order_frame.columns)):
                errors.append('订单信息缺少预发货日或预到货日')
    except Exception as exc:
        errors.append(f'订单文件无法读取：{exc}')
        order_frame = pd.DataFrame()
    try:
        rated_book = pd.ExcelFile(rated_path)
        missing_sheets = sorted(RATED_SHEETS - set(rated_book.sheet_names))
        if missing_sheets:
            errors.append('产品额定文件缺少Sheet：' + '、'.join(missing_sheets))
    except Exception as exc:
        errors.append(f'产品额定文件无法读取：{exc}')
    completed = 0
    completed_order_details = []
    if '结束码' in order_frame:
        completed_mask = order_frame['结束码'].astype(str).str.strip().eq('已结束')
        completed = int(completed_mask.sum())
        due_column = '预发货日' if '预发货日' in order_frame else \
            ('预到货日' if '预到货日' in order_frame else None)
        for _, row in order_frame.loc[completed_mask].iterrows():
            due_value = row.get(due_column) if due_column else None
            due_date = '' if pd.isna(due_value) else pd.Timestamp(due_value).strftime('%Y-%m-%d')
            completed_order_details.append({
                'order_id': str(row.get('内部订单单号-序号-次序号', '')).strip(),
                'product_name': str(row.get('品名', '')).strip(),
                'spec': str(row.get('规格', '')).strip(),
                'due_date': due_date,
                'finish_code': '已结束',
                'reason': '订单信息 Sheet 的“结束码”为“已结束”，属于历史已完结订单，不再安排剩余工序',
            })
    total = len(order_frame)
    return {
        'valid': not errors,
        'errors': errors,
        'warnings': warnings,
        'completed_order_details': completed_order_details,
        'summary': {
            'orders_total': total,
            'completed_orders': completed,
            'unfinished_orders': total - completed,
        },
    }
