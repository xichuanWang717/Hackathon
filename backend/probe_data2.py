# -*- coding: utf-8 -*-
"""第二轮探测：桥接命中率与品名模式。"""
import pandas as pd
import re

out = []
def p(s=''):
    out.append(str(s))

ORDER = r'F:\比赛\黑客松\订单信息.xlsx'
RATED = r'F:\比赛\黑客松\产品额定（平均值）.xlsx'

od = pd.read_excel(ORDER, sheet_name='订单信息')
ts = pd.read_excel(RATED, sheet_name='捻股')
hs = pd.read_excel(RATED, sheet_name='合绳（绳子+绳芯）')

# ---- 订单规格解析
pat = re.compile(r'^\s*(\d+(?:\.\d+)?)\s*mm\s*([A-Z0-9]+)\s*\(\s*(\d+)\s*\*\s*([A-Z0-9]+)\s*\+\s*([A-Z0-9]+)\s*\)\s*$', re.I)
def parse(spec):
    m = pat.match(str(spec))
    if not m:
        return None
    return dict(dia=float(m.group(1)), code=m.group(2), strands=int(m.group(3)),
                strand_struct=m.group(4), core=m.group(5))

od['spec_parsed'] = od['规格'].map(parse)
p(f'订单规格可解析: {od.spec_parsed.notna().sum()}/{len(od)}')
unparsed = od.loc[od.spec_parsed.isna(), '规格'].value_counts()
p('不可解析规格样例:')
p(unparsed.head(15).to_string())
p('')

# ---- 合绳表规格集合
hs_specs = hs['规格'].astype(str).unique().tolist()
p(f'合绳表唯一规格行数: {len(hs_specs)}')
p('样例: ' + ' ; '.join(hs_specs[:25]))
p('')

# ---- 直接命中测试：dia + (n*struct+core)
hs_set = set(s.strip() for s in hs_specs)
hit = miss = 0
miss_samples = []
for spec, d in od.loc[od.spec_parsed.notna(), '规格'].items():
    pr = od.at[spec if False else spec, 'spec_parsed'] if False else od.loc[spec, 'spec_parsed']
    direct = f'{pr["dia"]:g}mm {pr["strands"]}*{pr["strand_struct"]}+{pr["core"]}'
    if direct in hs_set:
        hit += 1
    else:
        miss += 1
        if len(miss_samples) < 12:
            miss_samples.append(f'{spec}  ->  {direct}')
p(f'合绳直接命中（dia+括号结构）: {hit}/{hit+miss}')
p('未命中样例:')
p('\n'.join(miss_samples))
p('')

# ---- 捻股表品名模式
names = ts['品名'].astype(str).unique().tolist()
p(f'捻股表唯一品名数: {len(names)}')
p('样例: ' + ' ; '.join(names[:30]))
# 结构分布
structs = ts['品名'].astype(str).str.extract(r'(1\+\d+|1\*\d+|\d+\*\d+|\d+WS|K\d+WS|[A-Z]+\d+)[ ]?B?\d*\s*$')[0].value_counts()
p('结构模式分布:')
p(structs.head(15).to_string())
p('')
# 捻股品名里带 直径mm 前缀的
diam = ts['品名'].astype(str).str.extract(r'(\d{4})\s')[0]
p(f'品名含4位直径编码的行: {diam.notna().sum()}/{len(ts)}')
p('直径编码范围: ' + str(sorted(set(diam.dropna()))[:10]) + ' ... ' + str(sorted(set(diam.dropna()))[-5:]))
p('')

# ---- 拉丝 NaN
ls = pd.read_excel(RATED, sheet_name='拉丝')
p(f'拉丝白班缺失 {ls["白班产量"].isna().sum()}/{len(ls)}，晚班缺失 {ls["晚班产量"].isna().sum()}')
p(ls[['设备编号', '设备类型', '规格区间', '白班产量', '晚班产量']].to_string())

with open(r'C:\Users\18833\WorkBuddy\2026-09-19-06-18-51\.workbuddy\probe2_out.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
