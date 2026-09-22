# -*- coding: utf-8 -*-
"""探测两份源数据的真实结构：表头、样例行、规格分布。"""
import pandas as pd
import json, sys

out = []
def p(s=''):
    out.append(str(s))

ORDER = r'F:\比赛\黑客松\订单信息.xlsx'
RATED = r'F:\比赛\黑客松\产品额定（平均值）.xlsx'

xl = pd.ExcelFile(ORDER)
p('订单信息.xlsx sheets: ' + repr(xl.sheet_names))
for sh in xl.sheet_names:
    df = xl.parse(sh)
    p(f'--- sheet {sh}: {df.shape[0]} rows x {df.shape[1]} cols')
    p('cols: ' + ' | '.join(f'{i}:{c}' for i, c in enumerate(df.columns)))
    p(df.head(4).to_string())
    p('')

xl2 = pd.ExcelFile(RATED)
p('产品额定.xlsx sheets: ' + repr(xl2.sheet_names))
for sh in xl2.sheet_names:
    df = xl2.parse(sh)
    p(f'--- sheet {sh}: {df.shape[0]} rows x {df.shape[1]} cols')
    p('cols: ' + ' | '.join(f'{i}:{c}' for i, c in enumerate(df.columns)))
    p(df.head(6).to_string())
    p('')

with open(r'C:\Users\18833\WorkBuddy\2026-09-19-06-18-51\.workbuddy\probe_out.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
