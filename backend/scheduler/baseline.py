"""用于衡量优化增益的可复现 EDD 基线。"""
from datetime import datetime


def edd_order(rows):
    ceiling = datetime.max
    return sorted(rows, key=lambda row: (row.get('due') or ceiling, str(row.get('order_id', ''))))

