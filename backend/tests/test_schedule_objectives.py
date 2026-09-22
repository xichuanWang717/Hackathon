from scheduler.official import objective_settings


def test_each_frontend_objective_maps_to_a_distinct_solver_policy():
    assert objective_settings('on_time') == ('fastest', 0.5)
    assert objective_settings('balanced') == ('balanced', 1.0)
    assert objective_settings('utilization') == ('least_loaded', 2.0)


def test_unknown_objective_is_rejected():
    try:
        objective_settings('anything')
    except ValueError as exc:
        assert '未知优化目标' in str(exc)
    else:
        raise AssertionError('unknown objective must be rejected')
