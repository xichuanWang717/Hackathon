# -*- coding: utf-8 -*-
"""R10 重排自检：插单 / 停机 / 物料 / 组合扰动。结果写 check_replan.txt。"""
import sys, time, io, traceback

sys.path.insert(0, r'F:\比赛\黑客松\后端算法')
sys.stdout = io.StringIO()


def _main():
    from datetime import timedelta
    from scheduler.dataloader import load_orders
    from scheduler.bridge import CapacityIndex
    from scheduler.engine import Engine
    from scheduler.replan import Replanner, RushOrderEvent, DowntimeEvent, MaterialDelayEvent

    t0 = time.time()
    orders = load_orders()
    eng = Engine(orders, CapacityIndex())
    base = eng.run()
    print(f'基线 {time.time()-t0:.1f}s: tasks={len(base.tasks)} kpi={base.kpi["on_time_rate"]:.1%} '
          f'异常={len(base.exceptions)}')

    now = base.baseline + timedelta(hours=24)
    # 找一张已排入的普通单（物料延迟演示）
    cand = [oid for oid, st in base.order_status.items()
            if st.get('status') == 'scheduled']
    target = cand[5] if len(cand) > 5 else cand[0]
    src = next(o for o in orders if o.oid == target)
    print(f'物料延迟目标: {src.short_id} {src.spec_raw} (qty {src.qty_m:g}m)')

    # 从已排单取一个可桥接的规格做插单
    rush_src = next(o for o in orders if not o.done and not o.backlog and not o.flags
                    and o.spec is not None and o.qty_m >= 1500)
    due = base.baseline + timedelta(days=6)
    events = [
        RushOrderEvent(rush_src.spec_raw, rush_src.qty_m, rush_src.qty_kg, due, oid='INSERT-001'),
        DowntimeEvent('8207', now, now + timedelta(hours=36), '捻股机主轴故障'),
        MaterialDelayEvent(target, now + timedelta(hours=72), 'WSC 绳芯缺货'),
    ]
    rp = Replanner(eng, base)
    t1 = time.time()
    report = rp.run(events, now=now)
    print(f'重排 {time.time()-t1:.1f}s')
    print('基线 KPI:', {k: round(v, 3) if isinstance(v, float) else v for k, v in report.baseline_kpi.items()})
    for o in report.options:
        print(f'\n== {o.name} ==')
        print('  KPI:', {k: round(v, 3) if isinstance(v, float) else v for k, v in o.kpi.items()})
        print('  impact:', {k: v for k, v in o.impact.items() if k != 'newly_late_list'})
        print('  newly_late 前3:', o.impact.get('newly_late_list', [])[:3])
        for n in o.notes:
            print('  ·', n)
        for c in o.changes[:8]:
            print('  变更:', c['order_id'], c['kind'], '-', c['reason'][:70])
        print('  冻结任务被移动:', o.impact.get('frozen_moved'))
    print('\n推荐:', report.recommendation)


try:
    _main()
except Exception:
    sys.stdout.write('\n==== TRACEBACK ====\n' + traceback.format_exc())
finally:
    with open(r'C:\Users\18833\WorkBuddy\2026-09-19-06-18-51\.workbuddy\check_replan.txt',
              'w', encoding='utf-8') as f:
        f.write(sys.stdout.getvalue())
