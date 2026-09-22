from pathlib import Path


FRONTEND = Path(__file__).resolve().parents[2] / 'frontend'


def test_bridge_persists_and_restores_dataset_session():
    source = (FRONTEND / 'backend-bridge.js').read_text(encoding='utf-8')
    assert 'schedule-dataset-session' in source
    assert 'restoreDatasetState' in source
    assert 'renderProgress' in source


def test_frontend_has_order_decision_explanation_index():
    source = (FRONTEND / 'app.js').read_text(encoding='utf-8')
    assert 'backendDecisionIndex' in source
    assert '排程决策解释' in source
    assert '关联订单' in source


def test_completed_filter_count_is_clickable_and_explained():
    source = (FRONTEND / 'backend-bridge.js').read_text(encoding='utf-8')
    assert 'completed-filter-trigger' in source
    assert 'completed-order-details' in source
    assert '结束码' in source


def test_completion_action_opens_a_visible_confirmation_form():
    source = (FRONTEND / 'app.js').read_text(encoding='utf-8')
    # The confirmation form must be before the long pending-order table: otherwise
    # clicking a top-row action looks like a dead button because the form appears
    # hundreds of rows below the viewport.
    assert source.index('id="archiveForm"') < source.index('${pendingRows}')
    assert 'host.scrollIntoView' in source


def test_archive_page_has_a_top_level_pending_archived_switch():
    source = (FRONTEND / 'app.js').read_text(encoding='utf-8')
    assert "let archiveView = 'pending'" in source
    assert 'data-archive-view="pending"' in source
    assert 'data-archive-view="archived"' in source
    assert "view.querySelectorAll('[data-archive-view]')" in source


def test_archive_page_supports_strict_no_extension_completion():
    source = (FRONTEND / 'app.js').read_text(encoding='utf-8')
    assert 'data-complete-strict' in source
    assert '未延期（严格交期）' in source
    assert "openArchiveForm(btn.dataset.completeStrict, 'strict')" in source


def test_manual_priority_is_persisted_across_browser_refreshes():
    source = (FRONTEND / 'app.js').read_text(encoding='utf-8')
    assert "production-dashboard-order-priority" in source
    assert 'saveAnnotationStore(PRIORITY_STORAGE_KEY, orderPriority)' in source
    assert 'readAnnotationStore(PRIORITY_STORAGE_KEY)' in source


def test_orders_show_real_schedule_state_and_priority_precedes_decision_explanation():
    source = (FRONTEND / 'app.js').read_text(encoding='utf-8')
    assert '待引擎校验' not in source
    assert 'orderScheduleState' in source
    order_detail = source.index('<section><h3>订单详情</h3>')
    priority = source.index('<section><h3>优先级（R9）</h3>', order_detail)
    explanation = source.index('${decisionExplanationMarkup(orderId)}', order_detail)
    assert priority < explanation


def test_order_center_defaults_to_business_priority_sorting():
    source = (FRONTEND / 'app.js').read_text(encoding='utf-8')
    assert 'sortOrdersByPriority' in source
    assert 'priorityLevel(String(a[0]))' in source
    assert "page==='orders'" in source


def test_gantt_has_process_filter_horizontal_scroll_and_png_export():
    app = (FRONTEND / 'app.js').read_text(encoding='utf-8')
    index = (FRONTEND / 'index.html').read_text(encoding='utf-8')
    css = (FRONTEND / 'styles.css').read_text(encoding='utf-8')
    assert 'ganttProcessFilter' in app
    assert 'exportGanttPNG' in app
    assert 'gantt-scroll' in index
    assert '.gantt-scroll' in css


def test_dashboard_discloses_beijing_clock_and_schedule_baseline():
    app = (FRONTEND / 'app.js').read_text(encoding='utf-8')
    index = (FRONTEND / 'index.html').read_text(encoding='utf-8')
    assert 'id="scheduleTimeContext"' in index
    assert "d.time_context" in app
    assert '排产计算从' in app


def test_dashboard_kpi_uses_full_future_order_forecast_not_empty_initial_window():
    app = (FRONTEND / 'app.js').read_text(encoding='utf-8')
    assert 'future_order_summary' in app
    assert 'strict_on_time_rate' in app
