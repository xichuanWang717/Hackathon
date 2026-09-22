"""候选排程的原子发布与审计。"""
from __future__ import annotations

from datetime import datetime


def publish_candidate(state: dict, candidate_version: str, option_id: str,
                      confirmed_by: str, reason: str) -> dict:
    """将已校验候选一次性发布；重复确认返回首次发布结果。"""
    actor = confirmed_by.strip()
    why = reason.strip()
    if not actor or not why:
        raise ValueError('人工确认必须填写操作者和原因')
    entry = state.get('replan_candidates', {}).get(candidate_version)
    if entry is None:
        raise ValueError('候选版本不存在或已失效')
    if entry.get('published'):
        return entry['published_response']
    if entry.get('baseline_version') != state.get('built_at'):
        raise ValueError('正式排程基线已变化，请重新生成候选方案')
    option = entry.get('options', {}).get(option_id)
    if option is None:
        raise ValueError('候选方案不存在')
    if not getattr(option, 'applicable', False) or option.result.feasibility != 'feasible':
        raise ValueError('候选方案未完整排入或硬约束未通过，不可发布')

    inserted = list(getattr(option, 'inserted_orders', []))
    inserted_ids = [order.oid for order in inserted]
    existing_ids = {order.oid for order in state['engine'].orders}
    for order in inserted:
        if order.oid not in existing_ids:
            state['engine'].orders.append(order)
            existing_ids.add(order.oid)

    before_kpi = dict(getattr(state['base'], 'kpi', {}))
    state['base'] = option.result
    confirmed_at = datetime.now().isoformat(timespec='seconds')
    record = {
        'action': 'publish_replan_candidate', 'candidate_version': candidate_version,
        'option_id': option_id, 'confirmed_by': actor, 'confirmed_at': confirmed_at,
        'reason': why, 'inserted_order_ids': inserted_ids,
        'before_kpi': before_kpi, 'after_kpi': dict(getattr(option.result, 'kpi', {})),
    }
    state.setdefault('audit_log', []).append(record)
    state['built_at'] = confirmed_at
    response = dict(record)
    response['ok'] = True
    entry['published'] = True
    entry['published_response'] = response
    return response
