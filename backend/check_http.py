# -*- coding: utf-8 -*-
"""HTTP 探活：health / dashboard / 首页静态资源。结果写 check_http.txt。"""
import urllib.request, json, traceback, sys

out = []
try:
    r = urllib.request.urlopen('http://127.0.0.1:8765/api/health', timeout=60)
    out.append('health: ' + str(r.status) + ' ' + r.read().decode()[:200])

    r = urllib.request.urlopen('http://127.0.0.1:8765/', timeout=30)
    html = r.read().decode('utf-8', errors='ignore')
    out.append('index: ' + str(r.status) + ' len=' + str(len(html)) +
               ' has-bridge=' + str('backend-bridge.js' in html))

    r = urllib.request.urlopen('http://127.0.0.1:8765/backend-bridge.js', timeout=30)
    out.append('bridge.js: ' + str(r.status) + ' len=' + str(len(r.read().decode())))

    r = urllib.request.urlopen('http://127.0.0.1:8765/api/dashboard', timeout=120)
    d = json.loads(r.read().decode())
    out.append('dashboard: ' + str(r.status) + ' machines=' + str(len(d['machines'])) +
               ' tasks=' + str(len(d['tasks'])) + ' on_time=' + str(d['kpi']['on_time_rate'])[:6])
    out.append('ALL HTTP CHECKS PASSED')
except Exception:
    out.append('TRACEBACK:\n' + traceback.format_exc())
with open(r'C:\Users\18833\WorkBuddy\2026-09-19-06-18-51\.workbuddy\check_http.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
