# -*- coding: utf-8 -*-
"""全局口径常量（V0.3 重写版）。

所有口径集中在这一处，任何修改必须同步《前端对接与算法说明.md》第五章。
"""
from dataclasses import dataclass
from datetime import datetime, timedelta
import os
from pathlib import Path

# ---- 计划窗口与时间口径 -------------------------------------------------
BASELINE = datetime(2026, 8, 3)           # 内置排产回放起点：按本赛题订单交期从 8 月 3 日开始计算
WINDOW_DAYS = 7                           # 正式甘特窗口 7 天；完整订单链仍继续求解
WINDOW_HOURS = WINDOW_DAYS * 24


@dataclass(frozen=True)
class ScheduleConfig:
    """一次排程运行的时间口径；API可覆盖默认值，结果必须回传该口径。"""
    schedule_anchor: datetime = BASELINE
    horizon_days: int = WINDOW_DAYS       # KPI与近期滚动优化窗口
    planning_horizon_days: int | None = None  # 默认不设人为截止；可用于情景模拟硬截止
    near_due_hours: float = 72.0

    def __post_init__(self):
        if isinstance(self.horizon_days, bool) or not isinstance(self.horizon_days, int):
            raise TypeError('horizon_days 必须为正整数')
        if self.horizon_days <= 0:
            raise ValueError('horizon_days 必须为正整数')
        if self.planning_horizon_days is not None:
            if (isinstance(self.planning_horizon_days, bool)
                    or not isinstance(self.planning_horizon_days, int)):
                raise TypeError('planning_horizon_days 必须为正整数或None')
            if self.planning_horizon_days < self.horizon_days:
                raise ValueError('planning_horizon_days 不得短于KPI窗口')

    @property
    def horizon_end(self) -> datetime:
        return self.schedule_anchor + timedelta(days=self.horizon_days)

    @property
    def horizon_hours(self) -> float:
        return self.horizon_days * 24.0

    @property
    def planning_end(self) -> datetime | None:
        if self.planning_horizon_days is None:
            return None
        return self.schedule_anchor + timedelta(days=self.planning_horizon_days)

# ---- 工序交接（R6）------------------------------------------------------
HANDOVER_MIN_H = 2.0                      # 相邻工序最小交接间隔
HANDOVER_MAX_H = 72.0                     # 相邻工序最大等待（超过即违规）

# ---- 拆批 ---------------------------------------------------------------
BATCH_TARGET_H = 24.0                     # 单批目标工时
BATCH_MAX = 12                            # 每单最多批次数
# 候选设备不可被展示/经验参数任意截断。当前产能矩阵包含 50 台捻股设备；
# 调度仍会逐台校验规格、班次、停机、换型和前后工序交接，只有兼容设备才会进入候选集。
PARALLEL_MAX = 50                         # 单工序最多并行兼容机台数（随企业设备矩阵校准）

# ---- 换型（R3）----------------------------------------------------------
# 换型键变化时固定占用 1 小时；同键连续生产不发生换型。
CHANGEOVER_H = 1.0
# 合绳上股准备：股数 × 10 分钟
ROPE_PREP_MIN_PER_STRAND = 10.0

# ---- 优先级（R9）--------------------------------------------------------
PRIORITY_ORDER = {0: '紧急', 1: '超时', 2: '普通'}
BACKLOG_TIER = 3                          # 积压单（交期早于基准日）

# ---- KPI 门禁 -----------------------------------------------------------
CONGESTED_RATE = 0.95                     # 利用率 > 95% 记拥堵
LATE_TOLERANCE_H = 72.0                   # 「可延期3天」容忍窗（默认无标签 → 保守按 0）

# ---- 桥接经验系数（全部推断值，标黄待企业确认）---------------------------
# 股径 ≈ 绳径 / 系数（普通圆股绳经验值）
STRAND_DIA_FACTOR = {6: 3.06, 8: 3.35, 18: 3.70, 34: 3.70, 35: 3.70,
                     41: 3.80, 42: 3.80, 34 + 7: 3.80}
STRAND_DIA_DEFAULT = 3.10
# 压实(K)股压实后股径增大系数（同丝量压实外径变小、填充系数变高 → 反推料径放大）
COMPACTED_FACTOR = 1.06
# 捻缩系数：股长 > 绳长
LAY_FACTOR = 1.03
# 钢丝占绳重比例（绳芯占其余）
WIRE_WEIGHT_RATIO = 0.90
# 拉丝台账「白班/晚班产量」为月度累计（kg/月），按 30 天 × 24h 摊到小时
WIRE_MONTHLY_TO_HOURLY = 1.0 / (30.0 * 24.0)
# 股结构 → 单丝直径系数（丝径 ≈ 股径 / f）
STRAND_WIRE_FACTOR = {'1*3': 3.0, '1+3': 3.0, '1+6': 3.0, '1+5': 2.8,
                      '1+8': 3.3, '1+9': 3.7, '1+12': 4.2,
                      '19S': 5.0, '19W': 5.0, '25F': 5.6, '26WS': 5.6,
                      '29FI': 5.8, '31WS': 6.0, '36WS': 6.4, '7': 3.0}

PROCESS_ORDER = ['拉丝', '捻股', '合绳']

# 仓库内置默认数据与前端；部署时仍可通过环境变量覆盖。
REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv('SCHEDULER_DATA_DIR', REPO_ROOT / 'data'))
ORDERS_XLSX = str(DATA_DIR / '订单信息.xlsx')
RATED_XLSX = str(DATA_DIR / '产品额定（平均值）.xlsx')
FRONTEND_DIR = str(Path(os.getenv('SCHEDULER_FRONTEND_DIR', REPO_ROOT / 'frontend')))
