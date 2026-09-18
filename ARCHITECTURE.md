# 智能排产指挥台架构约束

## 核心原则

排产结果必须由确定性算法引擎产生。DeepSeek 不能直接决定设备、工序和时间，只能提供结构化策略建议、自然语言解释和数据异常提醒。

## 三层职责

### 确定性排产引擎

- 接收订单、工艺、设备、物料、班制和维护窗口
- 计算设备分配、工序顺序、开始时间和结束时间
- 检查硬约束并输出可复现排程
- 输出 KPI、风险订单和每条排程的约束依据

### AI 策略适配层

- 将人工自然语言转换为策略 JSON
- 给出目标权重、首选工段、锁定设备等候选设置
- 解释算法输出，不直接改写排程
- AI 输出必须经过 Schema 校验和约束 lint

### 人工确认层

- 查看现行方案与候选方案的差异
- 查看准时率、逾期小时、换型次数、利用率等 KPI 对比
- 只有点击“采纳”后，候选策略才能成为新版本
- 拒绝或校验失败时保留现行方案

## 预留接口

算法实现接入后，统一暴露：

```text
POST /api/replan/config
```

输入应包含：

- `orders`
- `machines`
- `processRoutes`
- `materials`
- `constraints`
- `strategyPatch`
- `lockedTasks`

输出应包含：

- `schedule`
- `kpiBefore`
- `kpiAfter`
- `violations`
- `traceId`
- `strategyVersion`
- `status`（feasible / infeasible / timeout）

## AI 策略 JSON 约定

```json
{
  "strategyVersion": "ai-suggested-v1",
  "objectiveWeights": {
    "onTimeDelivery": 0.8,
    "changeoverCost": 0.15,
    "utilization": 0.05
  },
  "lockedMachines": ["8304"],
  "preferredZones": ["合绳"],
  "reason": "优先守住临近交期急单"
}
```

## 当前状态

- 前端界面、人工调序模板、设备态势和 AI 顾问入口已完成。
- DeepSeek 代理已完成，但它目前只返回策略建议 / 解释，不产生正式排程。
- 确定性算法引擎、`/api/replan/config`、约束校验和采纳闭环等待算法方案接入。

## 接入算法时的禁止事项

- 不允许用 AI 文本直接生成最终甘特图
- 不允许跳过设备不重叠、工序先后、物料和交期约束
- 不允许覆盖人工锁定任务
- 不允许没有 KPI 和 trace 就将候选方案设为正式方案
