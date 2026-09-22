# -*- coding: utf-8 -*-
"""引擎冒烟自检：加载 → 排产 → 打印 KPI 与样本。结果写入 check_out.txt。"""
import sys, time, io, traceback

sys.path.insert(0, r'F:\比赛\黑客松\后端算法')
sys.stdout = io.StringIO()


def _main():
    from scheduler.dataloader import load_orders
    from scheduler.bridge import CapacityIndex
    from scheduler.engine import Engine

    t0 = time.time()
    orders = load_orders()
    print(f'订单加载: {len(orders)} 单, 已结束 {sum(1 for o in orders if o.done)}, '
          f'积压 {sum(1 for o in orders if o.backlog)}, 数据问题 {sum(1 for o in orders if o.flags)}')

    idx = CapacityIndex()
    print(f'产能索引: 拉丝 {len(idx.wire)} 台, 捻股 {len(idx.strand_devs)} 台, '
          f'合绳 {len(idx.rope_devs)} 台, 捻股矩阵行 {len(idx.strand_matrix)}, 合绳矩阵行 {len(idx.rope_matrix)}')

    eng = Engine(orders, idx)
    res = eng.run()
    print(f'排产完成 {time.time()-t0:.1f}s: 任务 {len(res.tasks)} 条, '
          f'人工队列 {len(res.manual)}, 异常 {len(res.exceptions)}')
    print('KPI:', {k: (round(v, 4) if isinstance(v, float) else v) for k, v in res.kpi.items()})
    print('工序利用率:', {k: f'{v:.1%}' for k, v in res.util_by_process.items()})
    print(f'换型: {res.changeover_count} 次 / {res.changeover_hours:.0f}h')

    from collections import defaultdict
    by_order = defaultdict(list)
    for t in res.tasks:
        by_order[t.order_id].append(t)
    sample = list(by_order)[:3]
    for oid in sample:
        ts = sorted(by_order[oid], key=lambda t: t.start)
        print(f'\n--- {oid} ({ts[0].order_key})')
        for t in ts:
            print(f'  {t.process} {t.device} 批{t.batch} {t.start:%m-%d %H:%M} → {t.end:%m-%d %H:%M}')
            for tr in t.trace[:4]:
                print(f'     [{tr.rule}] {tr.text[:70]}')
        st = res.order_status.get(oid)
        print('  status:', st)

    print('\n人工队列样例:')
    for x in res.manual[:5]:
        print(' ', x['order_key'], x['stage'], x['reason'][:60])
    print('\n异常队列样例:')
    for x in res.exceptions[:5]:
        print(' ', x['order_key'], '延', x['late_days'], '天 |', x['delay_cause'])


try:
    _main()
except Exception:
    sys.stdout.write('\n==== TRACEBACK ====\n' + traceback.format_exc())
finally:
    with open(r'C:\Users\18833\WorkBuddy\2026-09-19-06-18-51\.workbuddy\check_out.txt',
              'w', encoding='utf-8') as f:
        f.write(sys.stdout.getvalue())
