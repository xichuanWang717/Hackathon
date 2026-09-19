/* backend-bridge.js — 智能排产指挥台 × 后端算法引擎 V0.3 桥接
 * 零侵入：不改 app.js 任何渲染逻辑，仅在数据就绪时调用
 * window.applyBackendData / window.applyAnalysisData（指挥台预留的接入点）。
 * 后端不可用时静默失败，页面保持内置演示数据（路演保底）。
 */
(function () {
  'use strict';
  var API = '';                       // 同源
  var state = { connected: false, lastReplan: null };

  function log(msg) { try { console.info('[bridge] ' + msg); } catch (e) {} }

  function setModeBadge(text, ok) {
    var dot = document.querySelector('.live-dot');
    if (dot) { dot.textContent = text; dot.style.color = ok ? '#1f9d61' : '#c0392b'; }
  }

  function applyDashboard(payload) {
    if (!payload || !payload.kpi) return;
    if (typeof window.applyBackendData === 'function') {
      window.applyBackendData(payload);
      state.connected = true;
      setModeBadge('已接入后端引擎', true);
      log('dashboard 已应用：' + (payload.engines && payload.engines.tasks) + ' 条排程');
    }
  }

  function fetchDashboard(retries, silent) {
    fetch(API + '/api/dashboard').then(function (r) {
      if (r.status === 202) { throw new Error('building'); }
      if (!r.ok) { throw new Error('HTTP ' + r.status); }
      return r.json();
    }).then(function (d) {
      applyDashboard(d);
      fetchAnalysis();
    }).catch(function (err) {
      if (err.message === 'building' && retries > 0) {
        setModeBadge('引擎预热中…', false);
        setTimeout(function () { fetchDashboard(retries - 1, silent); }, 3000);
      } else if (!silent) {
        setModeBadge('演示数据（后端未连接）', false);
        log('dashboard 拉取失败：' + err.message);
      }
    });
  }

  /* ---- 态势定时同步 ---------------------------------------------------- */
  // 侧栏实时时钟已按需求移除（时钟容器与 tickClock 一并删除）
  // 态势每 60s 静默重取引擎（失败不打扰当前画面）
  setInterval(function () {
    if (state.connected) fetchDashboard(1, true);
  }, 60000);

  function fetchAnalysis() {
    fetch(API + '/api/analysis').then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && typeof window.applyAnalysisData === 'function') {
          window.applyAnalysisData(d);
          log('analysis 已应用');
        }
      }).catch(function () {});
  }

  /* ---- 重排推演页：场景按钮触发真实算法重排 ---------------------------- */
  function postReplan(events, box) {
    setModeBadge('算法重排中…', false);
    fetch(API + '/api/replan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: events })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        state.lastReplan = d;
        setModeBadge('已接入后端引擎', true);
        var rec = d.recommendation || {};
        var html = '<div class="scenario-impact"><b>算法重排完成（R10 · 双方案）</b><ul>' +
          '<li>推荐：<b>' + esc(rec.option || '—') + '</b> — ' + esc(rec.reason || '') + '</li>';
        (d.options || []).forEach(function (o) {
          var imp = o.impact || {};
          html += '<li>' + esc(o.name) + '：扰动 <b>' + (imp.moved_orders || 0) + '</b> 单，' +
            '新增超期 <b>' + (imp.newly_late || 0) + '</b> 单（' +
            Math.round(imp.late_hours_total || 0) + 'h）' +
            ' <button class="primary-button bridge-apply" data-opt="' + esc(o.option_id) +
            '" type="button">应用该方案</button></li>';
        });
        html += '</ul><small>方案对比来自算法引擎 POST /api/replan；冻结任务（已开工）未移动 ' +
          ((d.options || [])[0] && d.options[0].impact.frozen_moved === 0 ? '✓' : '⚠') +
          '。应用后甘特/设备态势/订单池将刷新为算法结果。</small></div>';
        if (box) box.innerHTML = html;
      }).catch(function (err) {
        setModeBadge('已接入后端引擎', true);
        if (box) box.innerHTML = '<div class="scenario-impact"><b>算法重排失败</b><ul><li>' +
          esc(String(err)) + '</li></ul></div>';
      });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;

    var applyBtn = t.closest('.bridge-apply');
    if (applyBtn && state.lastReplan) {
      var opt = (state.lastReplan.options || []).filter(function (o) {
        return o.option_id === applyBtn.getAttribute('data-opt');
      })[0];
      if (opt && opt.dashboard) {
        applyDashboard(opt.dashboard);
        if (window.showToast) window.showToast('已应用' + opt.name + '的算法重排结果');
      }
      return;
    }

    var runShutdown = t.closest('#runShutdown');
    if (runShutdown) {
      var dev = document.querySelector('#shutdownDevice');
      var hrs = document.querySelector('#shutdownHours');
      if (dev && state.connected) {
        setTimeout(function () {
          postReplan([{ type: 'downtime', device: dev.value, hours: Number(hrs && hrs.value) || 8,
                        reason: '设备故障（重排推演）' }],
            document.querySelector('#scenarioResult'));
        }, 0);
      }
      return;
    }

    var runMaterial = t.closest('#runMaterial');
    if (runMaterial && state.connected) {
      var name = document.querySelector('#materialName');
      var mhrs = document.querySelector('#materialHours');
      setTimeout(function () {
        // 取当前选中设备在制订单作为物料延迟对象（演示口径）
        var sel = window.selected || {};
        var oid = sel.order && /^JW-/.test(sel.order) ? sel.order : '';
        postReplan([{ type: 'material', oid: oid, hours: Number(mhrs && mhrs.value) || 12,
                      reason: (name && name.value || '物料') + '延迟（重排推演）' }],
          document.querySelector('#scenarioResult'));
      }, 0);
      return;
    }

    var runInsert = t.closest('#runInsertBaseline');
    if (runInsert && state.connected) {
      // 演示插单：取 12mm 6*24+FC 小单规格（可桥接），数量 2000m
      setTimeout(function () {
        postReplan([{ type: 'insert', spec_raw: '12mm 6*24+FC', qty_m: 2000, qty_kg: 4800,
                      oid: 'INSERT-001', name: '紧急插单' }],
          document.querySelector('#scenarioResult'));
      }, 0);
    }
  }, true);

  /* ---- 启动 ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { fetchDashboard(10); });
  } else {
    fetchDashboard(10);
  }
})();
