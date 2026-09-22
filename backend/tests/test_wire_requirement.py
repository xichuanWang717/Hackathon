import pytest

from scheduler.bridge import parse_spec, wire_hours_from_meters, wire_requirement_m


def test_six_by_nineteen_requires_114_outer_wires():
    """若误把成品长度当一根钢丝长度，这个断言会失败。"""
    spec = parse_spec('10mm 6*19S+FC')

    assert wire_requirement_m(spec, 1000) == pytest.approx(117420)


def test_iwrc_is_not_added_to_inhouse_wire_requirement():
    """用户确认 IWRC 外购/可用，不纳入本厂拉丝需求。"""
    spec = parse_spec('22mm GT8ZH(8*K26WS+IWRC)')

    assert wire_requirement_m(spec, 1000) == pytest.approx(214240)


def test_35w_k7_uses_35_compacted_strands_and_excludes_wsc_core():
    """企业确认 35W*K7 为35股、每股7丝；WSC钢芯不进入本厂排程。"""
    spec = parse_spec('26mm GT34ZD(35W*K7+WSC)')

    assert spec.outer_wire_count == 245
    assert wire_requirement_m(spec, 1000) == pytest.approx(252350)


def test_wire_hours_use_outer_wire_requirement_not_finished_rope_length():
    spec = parse_spec('10mm 6*19S+FC')

    assert wire_hours_from_meters(wire_requirement_m(spec, 1000), 8) == pytest.approx(4.0770833333)
