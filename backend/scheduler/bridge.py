# -*- coding: utf-8 -*-
"""规格解析与产能桥接。

订单规格写的是「绳」的语言（22mm GT8ZH(8*K26WS+IWRC)），
产能矩阵写的是「丝/股/绳」的语言（拉丝=丝径区间、捻股=股径行、合绳=绳规格行）。
桥接规则全部是结构学推断，推断结果一律 inferred=True（前端标黄），待企业确认。
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta

import pandas as pd

from scheduler import config as C


def parse_wire_speed_mps(value) -> float:
    """严格读取《产品额定》拉丝速度，单位固定为 m/s。"""
    matched = re.search(r'(\d+(?:\.\d+)?)\s*m\s*/\s*s', str(value), re.I)
    if not matched:
        raise ValueError(f'拉丝速度必须为 m/s，当前值为 {value!r}')
    return float(matched.group(1))


def wire_hours_from_meters(length_m: float, speed_mps: float) -> float:
    """拉丝纯加工时间：订单米数 ÷ 表内设备 m/s；不做重量或丝径换算。"""
    if speed_mps <= 0:
        raise ValueError('拉丝速度必须大于 0 m/s')
    return float(length_m) / speed_mps / 3600.0

# ---- 订单规格解析 --------------------------------------------------------
# 标准：22mm GT8ZH(8*K26WS+IWRC) ；裸结构：22mm 6*24+FC
_PAT_BRA = re.compile(
    r'^\s*(\d+(?:\.\d+)?)\s*mm\s*([A-Z0-9]*)\s*\(\s*(\d+)[A-Z]?\s*\*\s*([A-Z0-9]+)\s*\+\s*([A-Z0-9]+)\s*\)\s*$',
    re.I)
_PAT_BARE = re.compile(
    r'^\s*(\d+(?:\.\d+)?)\s*mm\s+(\d+)[A-Z]?\s*\*\s*([A-Z0-9]+)\s*\+\s*([A-Z0-9]+)\s*$', re.I)


@dataclass
class Spec:
    raw: str
    dia: float                 # 绳径 mm
    strands: int               # 股数（多股结构 = 外层股数 + 股芯股数）
    strand_struct: str         # 股结构，如 K26WS / 26WS / W
    core: str                  # 绳芯 IWRC / WSC / FC / PIWRC
    code: str = ''             # 企业结构代码 GT8ZH 等
    compacted: bool = False    # K / GT = 压实
    total_strands: int = 0     # 上股总数（默认 = strands）
    strand_wire_n: int = 0     # 单股丝数（多股结构时用于丝径推断）

    def __post_init__(self):
        if not self.total_strands:
            self.total_strands = self.strands

    @property
    def struct_key(self) -> str:
        """股结构归一化键（去 K 前缀，保留数字+型别）。"""
        s = self.strand_struct.upper().replace('K', '', 1) if self.strand_struct.upper().startswith('K') \
            else self.strand_struct.upper()
        return s

    @property
    def outer_wire_count(self) -> int | None:
        """本厂需要拉制的外层钢丝根数；FC/IWRC/WSC 均不在本厂排产。"""
        if self.strand_wire_n:
            return self.strands * self.strand_wire_n
        numbers = re.findall(r'\d+', self.struct_key)
        if len(numbers) != 1:
            return None
        wires_per_strand = int(numbers[0])
        return self.strands * wires_per_strand if self.strands and wires_per_strand else None


def wire_requirement_m(spec: Spec, finished_rope_m: float) -> float:
    """外层钢丝总需求长度：成品绳长 × 钢丝根数 × 捻缩系数。"""
    wire_count = spec.outer_wire_count
    if wire_count is None:
        raise ValueError(f'规格「{spec.raw}」无法明确识别每股钢丝根数')
    return float(finished_rope_m) * wire_count * C.LAY_FACTOR


def parse_spec(raw: str) -> Spec | None:
    raw = str(raw).strip()
    m = _PAT_BRA.match(raw)
    if not m:
        m = _PAT_BARE.match(raw)
        if not m:
            return None
        dia, n_str, st, core = m.groups()
        code = ''
    else:
        dia, code, n_str, st, core = m.groups()
    st_u = st.upper()
    compacted = st_u.startswith('K') or code.upper().startswith('GT')
    n = int(re.sub(r'\D', '', n_str) or 0)
    n_suffix = re.sub(r'\d', '', n_str).upper()      # 'W' / '' 等
    total_strands = n
    strand_wire_n = 0
    if n >= 20:
        # 企业口径：35W*K7 = 35 股多层压实股，每股 K7（7 根钢丝）；
        # +WSC 为钢芯，不进入本厂拉丝、捻股排程。
        strand_wire_n = int(re.sub(r'\D', '', st_u) or 0)
        total_strands = n
    return Spec(raw=raw, dia=float(dia), code=code.upper(), strands=n,
                strand_struct=st_u, core=core.upper(), compacted=compacted,
                total_strands=total_strands, strand_wire_n=strand_wire_n)


# ---- 结构键 → 单丝系数（拉丝）-------------------------------------------
def wire_factor(struct_key: str, wire_n: int = 0) -> float:
    if wire_n:
        return max(3.0, wire_n ** 0.5 * 1.28)
    if struct_key in C.STRAND_WIRE_FACTOR:
        return C.STRAND_WIRE_FACTOR[struct_key]
    # 26WS/36WS 等带型别后缀
    m = re.match(r'^(\d+)(WS|W|S|FI|F)?$', struct_key)
    if m:
        n = int(m.group(1))
        return max(3.0, n ** 0.5 * 1.28)
    return 3.6


# ---- 股径估算（结构学推断，标黄）----------------------------------------
def strand_dia(spec: Spec) -> float:
    f = C.STRAND_DIA_FACTOR.get(spec.strands, C.STRAND_DIA_DEFAULT)
    d = spec.dia / f
    if spec.compacted:
        d *= C.COMPACTED_FACTOR
    return d


# ============================================================================
# 产能索引
# ============================================================================
@dataclass
class DeviceCap:
    code: str                  # 设备编号（str，去 .0）
    name: str
    process: str               # 拉丝 / 捻股 / 合绳
    interval: tuple | None     # 拉丝丝径区间 mm
    speed_mps: float           # 拉丝速度 m/s，严格来自《产品额定》
    note: str = ''             # 数据缺口说明


@dataclass
class Match:
    """一张订单的产能匹配结果。"""
    rope_rows: list = field(default_factory=list)     # 合绳: [(device, m_per_min, row_key)]
    strand_rows: list = field(default_factory=list)   # 捻股: [(device, m_per_min, row_key)]
    wire_devs: list = field(default_factory=list)     # 拉丝: [(device, kg_per_h)]
    strand_dia: float | None = None
    wire_dia: float | None = None
    strand_len_m: float | None = None                 # 单批股需求长度基准（按整单）
    inferred: bool = False                            # 任一工序走推断 → True（标黄）
    rope_match_kind: str = ''                         # direct / near / none
    strand_match_kind: str = ''                       # direct / near / none
    reasons: list = field(default_factory=list)       # 桥接解释（trace 用）


class CapacityIndex:
    """三工序产能索引（从产品额定.xlsx 构建）。"""

    def __init__(self, rated_xlsx: str | None = None):
        self.rated_xlsx = rated_xlsx or C.RATED_XLSX
        self.wire: dict[str, DeviceCap] = {}          # 拉丝
        self.strand_matrix: list[dict] = []           # 捻股行: {key, dia, rates{dev:rate}}
        self.rope_matrix: list[dict] = []             # 合绳行: {key, dia, struct, rates}
        self.strand_devs: list[str] = []
        self.rope_devs: list[str] = []
        self._build()

    # ------------------------------------------------------------------
    def _build(self):
        ls = pd.read_excel(self.rated_xlsx, sheet_name='拉丝')
        for _, r in ls.iterrows():
            code = str(int(r['设备编号']))
            speed = parse_wire_speed_mps(r['拉丝速度'])
            iv = tuple(float(x) for x in str(r['规格区间']).split('-'))
            self.wire[code] = DeviceCap(code=code, name=str(r['设备名称']),
                                        process='拉丝', interval=iv,
                                        speed_mps=speed)

        ts = pd.read_excel(self.rated_xlsx, sheet_name='捻股')
        devs = [c.split('(')[0] for c in ts.columns[5:]]
        self.strand_devs = devs
        for _, r in ts.iterrows():
            raw = str(r['品名'])
            m = re.match(r'.*?(\d{3,4})\s+(.+?)\s*B?\d*\s*$', raw)
            if not m:
                continue
            dia = int(m.group(1)) / 100.0
            key = f'{dia:g}|{m.group(2)}'
            rates = {}
            for c, dev in zip(ts.columns[5:], devs):
                v = r[c]
                if pd.notna(v) and v > 0:
                    rates[dev] = float(v)
            if rates:
                self.strand_matrix.append({'key': key, 'dia': dia, 'struct': m.group(2), 'rates': rates})

        hs = pd.read_excel(self.rated_xlsx, sheet_name='合绳（绳子+绳芯）')
        self.rope_devs = [c.split('(')[0] for c in hs.columns[5:]]
        for _, r in hs.iterrows():
            spec_raw = str(r['规格']).strip()
            m = re.match(r'^(\d+(?:\.\d+)?)\s*mm\s*(.*)$', spec_raw)
            if not m:
                continue
            dia = float(m.group(1))
            rest = m.group(2).strip()
            bm = re.match(r'^[A-Z0-9]*\s*\(\s*(.+?)\s*\)\s*$', rest, re.I)
            struct = bm.group(1).upper() if bm else rest.upper()
            struct = re.sub(r'\s+', '', struct)
            rates = {}
            for c, dev in zip(hs.columns[5:], self.rope_devs):
                v = r[c]
                if pd.notna(v) and v > 0:
                    rates[dev] = float(v)
            if rates:
                self.rope_matrix.append({'key': spec_raw, 'dia': dia, 'struct': struct,
                                         'struct_raw': rest, 'rates': rates})

    # ------------------------------------------------------------------
    def rope_lookup(self, spec: Spec) -> tuple[list, str]:
        """合绳匹配：结构精确 → 直径相同结构近似 → 直径邻近同股数。"""
        want = f"{spec.strands:g}*{spec.strand_struct}+{spec.core}"
        want_n = re.sub(r'\s+', '', want).upper()
        for row in self.rope_matrix:
            if abs(row['dia'] - spec.dia) < 0.01 and row['struct'] == want_n:
                return row['rates'], 'direct'
        # 结构近似：去 K 前缀 / 绳芯等价
        core_eq = {'PIWRC': 'IWRC'}
        want_alt = re.sub(r'\s+', '', f"{spec.strands:g}*{spec.struct_key}+{core_eq.get(spec.core, spec.core)}")
        for row in self.rope_matrix:
            if abs(row['dia'] - spec.dia) < 0.01 and row['struct'] == want_alt:
                return row['rates'], 'direct'
        for row in self.rope_matrix:
            if abs(row['dia'] - spec.dia) < 0.01 and row['struct'].startswith(f'{spec.strands:g}*'):
                return row['rates'], 'near'
        # 直径邻近代替（±0.5mm）
        cands = [r for r in self.rope_matrix if abs(r['dia'] - spec.dia) <= 0.5]
        if cands:
            cands.sort(key=lambda r: abs(r['dia'] - spec.dia))
            return cands[0]['rates'], 'near'
        return {}, 'none'

    def strand_lookup(self, spec: Spec, s_dia: float) -> tuple[list, str, str]:
        """捻股匹配：股径邻近 + 同型别行。返回 (rates, kind, row_key)。"""
        exact = [r for r in self.strand_matrix if abs(r['dia'] - s_dia) < 0.015]
        if exact:
            # 同一直径多行（不同 B 档/捻距）取速率均值行
            return exact[0]['rates'], 'direct', exact[0]['key']
        cands = [r for r in self.strand_matrix if abs(r['dia'] - s_dia) <= 0.15]
        if cands:
            cands.sort(key=lambda r: abs(r['dia'] - s_dia))
            return cands[0]['rates'], 'near', cands[0]['key']
        cands = [r for r in self.strand_matrix if abs(r['dia'] - s_dia) <= 0.4]
        if cands:
            cands.sort(key=lambda r: abs(r['dia'] - s_dia))
            return cands[0]['rates'], 'near', cands[0]['key']
        return {}, 'none', ''

    def wire_lookup(self, w_dia: float) -> list:
        out = []
        for cap in self.wire.values():
            if cap.interval and cap.interval[0] - 0.03 <= w_dia <= cap.interval[1] + 0.03:
                out.append((cap.code, cap.speed_mps, '产品额定拉丝速度 m/s'))
        return out


def match_order(spec: Spec, qty_kg: float, qty_m: float, idx: CapacityIndex) -> Match:
    """一张订单 → 三工序可用产能。所有推断环节写入 reasons（trace 素材）。"""
    m = Match()
    s_dia = strand_dia(spec)
    m.strand_dia = s_dia
    w_f = wire_factor(spec.struct_key, spec.strand_wire_n)
    w_dia = s_dia / w_f
    m.wire_dia = w_dia

    # 捻股需求长度：绳长 × 上股总数 × 捻缩（多股结构按 41/42 股全长需求）
    eff_strands = spec.total_strands if spec.total_strands > 20 else spec.strands
    strand_len = qty_m * eff_strands * C.LAY_FACTOR
    m.strand_len_m = strand_len

    rope_rates, rope_kind = idx.rope_lookup(spec)
    if rope_rates:
        m.rope_rows = [(d, v, '') for d, v in sorted(rope_rates.items(), key=lambda kv: -kv[1])]
        m.rope_match_kind = rope_kind
        if rope_kind != 'direct':
            m.inferred = True
            m.reasons.append(f'合绳：规格「{spec.raw}」无直接对应行，按直径/股数邻近行推断（标黄）')
        else:
            m.reasons.append(f'合绳：结构 {spec.strands:g}*{spec.strand_struct}+{spec.core} 直接命中产能矩阵')
    else:
        m.reasons.append('合绳：产能矩阵无相近行 → 无法排产')

    s_rates, s_kind, s_key = idx.strand_lookup(spec, s_dia)
    if s_rates:
        m.strand_rows = [(d, v, s_key) for d, v in sorted(s_rates.items(), key=lambda kv: -kv[1])]
        m.strand_match_kind = s_kind
        if s_kind != 'direct':
            m.inferred = True
            m.reasons.append(f'捻股：股径 {s_dia:.2f}mm 为结构学推断（股径≈绳径/{spec.strands} 系数），'
                             f'按邻近行 {s_key} 取产能（标黄）')
        else:
            m.reasons.append(f'捻股：股径 {s_dia:.2f}mm 命中矩阵行 {s_key}（股径由绳径反推，标黄）')
    else:
        m.inferred = True
        m.reasons.append(f'捻股：股径 {s_dia:.2f}mm 推断值在矩阵范围外 → 无法排产')

    wires = idx.wire_lookup(w_dia)
    if wires:
        m.wire_devs = [(d, speed, note) for d, speed, note in wires]
        speeds = sorted({f'{speed:g}' for _, speed, _ in wires})
        m.reasons.append(f'拉丝：{len(wires)} 台设备规格区间覆盖；速度 '
                         f'{"/".join(speeds)}m/s，纯加工时间严格按订单米数÷m/s')
    else:
        m.inferred = True
        m.reasons.append(f'拉丝：推断丝径 {w_dia:.2f}mm 无设备区间覆盖 → 无法排产')
    return m
