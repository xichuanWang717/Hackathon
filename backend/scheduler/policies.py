"""人工业务策略：只有企业明确导入的标签才能放宽交付承诺。"""
from dataclasses import dataclass
from typing import Literal, Mapping, Any
from datetime import datetime


@dataclass(frozen=True)
class DelayPolicy:
    code: Literal['hard', 'tolerant_72h', 'unconfirmed'] = 'hard'
    tolerance_hours: int = 0
    source: str = ''
    note: str = ''
    confirmed: bool = False

    @property
    def explanation(self) -> str:
        if self.code == 'tolerant_72h' and self.confirmed:
            suffix = f'；备注：{self.note}' if self.note else ''
            return f'企业人工确认：客户允许延期 72 小时{suffix}'
        return '默认不可延期；未获得企业人工确认'


def parse_delay_policy_row(row: Mapping[str, Any] | None) -> DelayPolicy:
    row = row or {}
    strategy = str(row.get('延期策略', '') or '').strip()
    source = str(row.get('来源', '') or '').strip()
    note = str(row.get('备注', '') or '').strip()
    trusted = source in {'enterprise_import', 'enterprise_manual'}
    if strategy == '可延期3天' and trusted:
        return DelayPolicy('tolerant_72h', 72, source, note, True)
    return DelayPolicy('hard', 0, source, note, False)


def classify_priority(manual_rush: bool, due: datetime | None, policy: DelayPolicy,
                      now: datetime, near_due_hours: float = 72.0) -> int:
    """P0急单；P1/P2硬承诺；P3/P4仅限企业确认可延期订单。"""
    if manual_rush:
        return 0
    near_due = due is not None and (due - now).total_seconds() <= near_due_hours * 3600
    tolerant = policy.code == 'tolerant_72h' and policy.confirmed
    if not tolerant:
        return 1 if near_due else 2
    return 3 if near_due else 4
