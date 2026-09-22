# -*- coding: utf-8 -*-
"""核对 /api/dashboard 的设备状态分布，写入 UTF-8 文件供读取。"""
import json
import urllib.request
from collections import Counter

out = r"C:\Users\18833\WorkBuddy\2026-09-19-06-18-51\.workbuddy\dash_check.txt"
lines = []

try:
    with urllib.request.urlopen("http://127.0.0.1:8765/api/dashboard", timeout=30) as r:
        d = json.loads(r.read().decode("utf-8"))
except Exception as e:
    with open(out, "w", encoding="utf-8") as f:
        f.write(f"FETCH FAIL: {e}")
    raise SystemExit

lines.append("top keys: " + ", ".join(d.keys()))
meta = d.get("meta") or {}
lines.append(f"meta: source={meta.get('source')} built_at={meta.get('built_at')}")

devs = d.get("devices") or []
lines.append(f"devices: {len(devs)}")
if devs:
    lines.append("device sample keys: " + ", ".join(devs[0].keys()))
    by_proc = {}
    for x in devs:
        by_proc.setdefault(x.get("process") or x.get("zone") or "?", Counter())[x.get("status", "?")] += 1
    for p, c in by_proc.items():
        lines.append(f"  {p}: " + " ".join(f"{k}={v}" for k, v in c.most_common()))

kpi = d.get("kpi") or {}
lines.append("kpi: " + json.dumps(kpi, ensure_ascii=False)[:400])

tasks = d.get("tasks") or []
lines.append(f"tasks(payload): {len(tasks)}")
if tasks:
    lines.append("task sample: " + json.dumps(tasks[0], ensure_ascii=False)[:300])

with open(out, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("ok")
