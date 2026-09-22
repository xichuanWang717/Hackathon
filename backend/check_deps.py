import importlib.util
mods = {m: (importlib.util.find_spec(m) is not None)
        for m in ['fastapi', 'uvicorn', 'pydantic', 'pandas', 'openpyxl']}
with open(r'C:\Users\18833\WorkBuddy\2026-09-19-06-18-51\.workbuddy\deps3.txt', 'w') as f:
    f.write(str(mods))
