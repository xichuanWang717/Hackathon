# -*- coding: utf-8 -*-
"""等引擎预热后核对各工段"此刻在生产"的台数，写入文件。"""
import json
import time
import urllib.request
from collections import Counter

out = r"C:\Users\18833\WorkBuddy\2026-09-19-06-18-51\.workbuddy\fix_check.txt"
lines = []

for attempt in range(40):
    try:
        with urllib.request.urlopen("http://127.0.0.1:8765/api/dashboard", timeout=30) as r:
            d = json.loads(r.read().decode("utf-8"))
        if r.status == 200 and d.get("machines"):
            break
    except Exception:
        pass
    time.sleep(5)
else:
    with open(out, "w", encoding="utf-8") as f:
        f.write("server not ready after retries")
    raise SystemExit

cnt = Counter()
util_by_proc = Counter()
for m in d["machines"]:
    cnt[(m["zone"], m["status"])] += 1
zones = ["拉丝", "捻股", "合绳"]
for z in zones:
    parts = " ".join(f"{s}={cnt.get((z, s), 0)}" for s in ("normal", "change", "queued", "risk", "idle"))
    lines.append(f"{z}: {parts}")

# 抽一台在生产的捻股/合绳机看细节
for z in ("捻股", "合绳"):
    m = next((x for x in d["machines"] if x["zone"] == z and x["status"] == "normal"), None)
    if m:
        lines.append(f"{z} 在制样例: {m['id']} 订单 {m['order']} 利用率 {m['capacity']}")
    else:
        lines.append(f"{z}: 此刻无在制（该时刻点真实排布如此）")

k = d.get("kpi", {})
lines.append(f"kpi: on_time={k.get('on_time_rate'):.3f} util={k.get('utilization'):.3f} congested={k.get('congested')}")

with open(out, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("ok")
