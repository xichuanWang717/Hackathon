def test_server_contains_hard_validation_gate():
    source = open('server.py', encoding='utf-8').read()
    assert "base.feasibility != 'feasible'" in source
    assert '禁止发布' in source


def test_server_exposes_enterprise_delay_policy_endpoint():
    source = open('server.py', encoding='utf-8').read()
    assert "@app.post('/api/delay-policy')" in source
    assert 'set_delay_policy' in source


def test_server_exposes_device_event_endpoint_and_kpi_scope():
    source = open('server.py', encoding='utf-8').read()
    assert "@app.post('/api/device-event')" in source
    assert 'kpi_scope' in source


def test_server_exposes_current_pending_dataset_metadata():
    source = open('server.py', encoding='utf-8').read()
    assert "@app.get('/api/datasets/current')" in source
    assert 'pending_dataset' in source


def test_server_restores_latest_confirmed_dataset_on_restart():
    source = open('server.py', encoding='utf-8').read()
    assert 'restore_confirmed_dataset' in source
    assert "metadata.get('status') == 'confirmed'" in source


def test_server_exposes_schedule_preview_endpoint():
    source = open('server.py', encoding='utf-8').read()
    assert "@app.post('/api/schedule/preview')" in source
    assert 'SchedulePreviewBody' in source


def test_preview_is_a_pollable_background_job_and_ai_has_same_origin_endpoint():
    source = open('server.py', encoding='utf-8').read()
    assert "@app.get('/api/schedule/preview/status')" in source
    assert 'preview_job' in source
    assert "@app.post('/api/ai/schedule')" in source
