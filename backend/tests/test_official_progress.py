import inspect

from scheduler.official import build_official_schedule


def test_official_schedule_accepts_progress_callback():
    signature = inspect.signature(build_official_schedule)
    assert 'progress_callback' in signature.parameters


def test_official_schedule_defines_intermediate_progress_stages():
    source = inspect.getsource(build_official_schedule)
    for percent, stage in [
        (15, '读取订单与产能'),
        (35, '评估订单物理可行性'),
        (55, '计算ATC优先级'),
        (72, '生成主排程'),
        (88, '补排未承诺订单'),
        (96, '校验交期与约束'),
    ]:
        assert f"progress_callback({percent}, '{stage}')" in source

