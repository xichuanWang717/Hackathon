"""订单剩余未交数量计算；任何单位或状态歧义都交由人工确认。"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Iterable, Mapping, Any


@dataclass(frozen=True)
class RemainingQuantityResult:
    remaining_m: float | None
    remaining_kg: float | None
    status: Literal['ready', 'state_review', 'unit_review', 'overdelivered']
    trace: tuple[dict, ...]


def compute_remaining_quantity(
    original_m: float,
    original_kg: float,
    sales_rows: Iterable[Mapping[str, Any]],
    snapshot_at: datetime,
) -> RemainingQuantityResult:
    valid = tuple(dict(row) for row in sales_rows if row['sale_at'] <= snapshot_at)
    if any(row.get('qty_m') is None or row.get('qty_kg') is None for row in valid):
        return RemainingQuantityResult(None, None, 'unit_review', valid)
    remaining_m = float(original_m) - sum(float(row['qty_m']) for row in valid)
    remaining_kg = float(original_kg) - sum(float(row['qty_kg']) for row in valid)
    if remaining_m < 0 or remaining_kg < 0:
        return RemainingQuantityResult(remaining_m, remaining_kg, 'overdelivered', valid)
    if remaining_m == 0 or remaining_kg == 0:
        return RemainingQuantityResult(remaining_m, remaining_kg, 'state_review', valid)
    return RemainingQuantityResult(remaining_m, remaining_kg, 'ready', valid)
