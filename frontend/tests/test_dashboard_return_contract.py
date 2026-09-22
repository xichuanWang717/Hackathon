from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_dashboard_return_restores_threejs_canvas_without_zeroing_it():
    source = (ROOT / "app.js").read_text(encoding="utf-8")

    assert "if(!w||!h)return false" in source
    assert "window.__plant3d = { selector, visuals" in source
    assert "requestAnimationFrame(()=>window.__plant3d?.resize?.())" in source
