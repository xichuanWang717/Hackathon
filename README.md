# 智能排产指挥台

本仓库已整合当前可运行的前端、完整排产后端和比赛数据。

## 目录

- `frontend/`：生产指挥台、历史甘特图、订单中心、AI 排产顾问前端与本地 AI 代理。
- `backend/`：FastAPI 服务、完整排产算法、历史计划、紧急插单和测试。
- `data/`：订单信息与产品额定数据。

## 启动后端和网页

```powershell
python -m pip install -r backend/requirements.txt
python backend/server.py
```

打开 <http://127.0.0.1:8765/>。后端会直接托管 `frontend/`，默认读取 `data/`。

## 启动 AI 托管

```powershell
$env:DEEPSEEK_API_KEY = '你的密钥'
node frontend/ai-server.js
```

密钥不要提交到 Git。数据目录、前端目录和运行数据位置可分别使用
`SCHEDULER_DATA_DIR`、`SCHEDULER_FRONTEND_DIR`、`SCHEDULE_HISTORY_DIR`、
`SCHEDULER_UPLOAD_DIR` 环境变量覆盖。

## 验证

```powershell
python -m pytest backend/tests -q
```
