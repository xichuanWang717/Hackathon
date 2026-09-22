"""将订单行动分类转成构造式排程优先级。"""
from datetime import datetime


CLASS_RANK = {
    '已准时保护': 0,
    '可抢救': 1,
    '物理上暂不可准时': 2,
    '数据待补': 3,
    '已完成': 4,
}


def classification_priority_key(order, category: str, manual_rank: int = 0):
    """P0最高；再保护准时单、抢救可行单，最后安排暂不可准时单。"""
    p0_bucket = 0 if order.tier == 0 else 1
    return (
        p0_bucket,
        CLASS_RANK.get(category, 3),
        manual_rank,
        order.delivery or datetime.max,
        -float(order.qty_m),
    )
