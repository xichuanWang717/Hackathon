# -*- coding: utf-8 -*-
"""端到端验证：server API 全链路（不实际开端口，直接调函数）。结果写 check_api.txt。"""
import sys, io, traceback
sys.path.insert(0, r'F:\比赛\黑客松\后端算法')
sys.stdout = io.StringIO()


def _main():
    import server as S

    S.build_once()
    print('ready=', S.STATE['ready'], 'build_seconds=', S.STATE['build_seconds'])

    d = S.dashboard()
    print('dashboard keys:', sorted(d.keys()))
    print('kpi:', {k: round(v, 3) if isinstance(v, float) else v for k, v in d['kpi'].items()})
    print('machines:', len(d['machines']), '样例:', d['machines'][0])
    print('tasks rows:', len(d['tasks']), 'bars in row0:', len(d['tasks'][0]['bars']))
    print('gantt labels:', d['gantt']['labels'])
    print('orders rows:', len(d['orders']), d['orders'][1])
    print('risks:', len(d['risks']))

    a = S.analysis()
    print('\nanalysis keys:', sorted(a.keys()))
    print('utilByProcess:', a['utilByProcess'])
    print('distribution:', [(x['label'], x['count']) for x in a['distribution']])
    print('topDevices:', [(x['code'], round(x['rate'], 2)) for x in a['topDevices']])

    # 重排 API
    body = S.ReplanBody(events=[
        {'type': 'insert', 'spec_raw': '12mm 6*24+FC', 'qty_m': 2000, 'qty_kg': 4800},
        {'type': 'downtime', 'device': '8204', 'hours': 12},
    ])
    rep = S.replan(body)
    print('\nreplan ok:', rep['ok'], '| 推荐:', rep['recommendation']['option'])
    for o in rep['options']:
        print(f"  {o['option_id']}: kpi.on_time={o['kpi'].get('on_time_rate', 0):.1%} "
              f"moved={o['impact']['moved_orders']} newly_late={o['impact']['newly_late']} "
              f"dashboard_tasks={len(o['dashboard']['tasks'])}")

    p = S.priority(S.PriorityBody(order_id='JW-0821-22', tier=0))
    print('\npriority:', p['order_id'], 'accepted=', p['accepted'], 'status=', p['schedule_status'])

    print('\n=== API 链路全部通过 ===')


try:
    _main()
except Exception:
    sys.stdout.write('\n==== TRACEBACK ====\n' + traceback.format_exc())
finally:
    with open(r'C:\Users\18833\WorkBuddy\2026-09-19-06-18-51\.workbuddy\check_api.txt',
              'w', encoding='utf-8') as f:
        f.write(sys.stdout.getvalue())
