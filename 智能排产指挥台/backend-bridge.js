/* 智能排产指挥台 × 后端算法引擎 V0.4 */
(function () {
  'use strict';
  var API = '';
  var STORAGE_KEY = 'schedule-dataset-session';
  var state = { connected: false, lastReplan: null, pendingDataset: null, scheduleStatus: null, pollTimer: null };
  window.backendUploadEnabled = true;

  function saveDatasetState() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ dataset: state.pendingDataset, schedule: state.scheduleStatus })); } catch (e) {}
  }
  function restoreDatasetState() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) { state.pendingDataset = saved.dataset || null; state.scheduleStatus = saved.schedule || null; }
    } catch (e) { sessionStorage.removeItem(STORAGE_KEY); }
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function log(message) { try { console.info('[bridge] ' + message); } catch (e) {} }
  function setModeBadge(text, ok) {
    var dot = document.querySelector('.live-dot');
    if (dot) { dot.textContent = text; dot.style.color = ok ? '#1f9d61' : '#c47b2d'; }
  }
  function jsonFetch(url, options) {
    return fetch(API + url, options).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) {
          var detail = body.detail || body.message || ('HTTP ' + response.status);
          if (typeof detail === 'object') detail = detail.message || JSON.stringify(detail);
          throw new Error(detail);
        }
        return body;
      });
    });
  }
  function toast(message) { if (typeof window.showToast === 'function') window.showToast(message); }

  function applyDashboard(payload) {
    if (!payload || !payload.kpi) return;
    if (typeof window.applyBackendData === 'function') {
      window.applyBackendData(payload);
      state.connected = true;
      setModeBadge('已接入后端引擎', true);
      log('dashboard 已应用');
    }
  }
  function fetchDashboard(retries, silent) {
    fetch(API + '/api/dashboard').then(function (response) {
      if (response.status === 202) throw new Error('building');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (data) {
      applyDashboard(data);
      fetchAnalysis();
    }).catch(function (error) {
      if (error.message === 'building' && retries > 0) {
        setModeBadge('引擎预热中…', false);
        setTimeout(function () { fetchDashboard(retries - 1, silent); }, 3000);
      } else if (!silent) {
        setModeBadge('演示数据（后端未连接）', false);
        log('dashboard 拉取失败：' + error.message);
      }
    });
  }
  function fetchAnalysis() {
    fetch(API + '/api/analysis').then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && typeof window.applyAnalysisData === 'function') window.applyAnalysisData(data);
      }).catch(function () {});
  }

  window.requestBackendSchedulePreview = function (options) {
    return jsonFetch('/api/schedule/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective: options.objective, window_days: options.windowDays })
    }).then(function (job) {
      return new Promise(function (resolve, reject) {
        function poll() {
          jsonFetch('/api/schedule/preview/status?job_id=' + encodeURIComponent(job.job_id)).then(function (status) {
            if (typeof options.onProgress === 'function') options.onProgress(status);
            if (status.status === 'ready') {
              applyDashboard(status.payload);
              fetchAnalysis();
              resolve(status.payload.preview || {});
            } else if (status.status === 'failed') {
              reject(new Error(status.error || '后端试排失败'));
            } else {
              setTimeout(poll, 1200);
            }
          }).catch(reject);
        }
        poll();
      });
    });
  };

  function ensureUploadControls() {
    var input = document.querySelector('#dataInput');
    var result = document.querySelector('#importResult');
    if (!input || !result) return;
    input.accept = '.xlsx,.xls';
    input.multiple = true;
    var title = document.querySelector('#dropZone b');
    var hint = document.querySelector('#fileHint');
    var choose = document.querySelector('#chooseFile');
    if (title) title.textContent = '同时选择两份 Excel';
    if (hint && !state.pendingDataset) hint.textContent = '需要“订单信息.xlsx”和“产品额定（平均值）.xlsx”';
    if (choose) choose.textContent = '选择两份文件';
    if (!document.querySelector('#backendDatasetActions')) {
      var actions = document.createElement('div');
      actions.id = 'backendDatasetActions';
      actions.className = 'backend-import-actions';
      actions.hidden = true;
      actions.innerHTML = '<button id="confirmDatasetBtn" type="button">确认使用此数据</button>' +
        '<button id="runScheduleBtn" class="primary-button" type="button" disabled>开始智能排产</button>' +
        '<div class="schedule-progress" id="scheduleProgress" hidden><i></i></div>' +
        '<span id="scheduleRunStatus" class="module-note" role="status" aria-live="polite"></span>';
      result.insertAdjacentElement('afterend', actions);
    }
    if (state.pendingDataset && result.dataset.datasetId !== state.pendingDataset.dataset_id) renderValidation(state.pendingDataset);
    else renderProgress(state.scheduleStatus);
    if (state.scheduleStatus && state.scheduleStatus.building) {
      actions.hidden = false;
      var confirm = document.querySelector('#confirmDatasetBtn');
      if (confirm) confirm.disabled = true;
    }
  }
  function pickFiles(files) {
    var excel = Array.prototype.slice.call(files || []).filter(function (file) { return /\.xlsx?$/i.test(file.name); });
    var orders = excel.filter(function (file) { return /订单/.test(file.name); })[0];
    var rated = excel.filter(function (file) { return /额定|产能|工艺/.test(file.name); })[0];
    if (!orders && excel.length === 2) orders = excel[0];
    if (!rated && excel.length === 2) rated = excel[1] === orders ? excel[0] : excel[1];
    if (!orders || !rated || orders === rated) throw new Error('请同时选择订单信息和产品额定两份 Excel 文件');
    return { orders: orders, rated: rated };
  }
  function renderValidation(data) {
    var result = document.querySelector('#importResult');
    var actions = document.querySelector('#backendDatasetActions');
    if (!result || !actions) return;
    var summary = data.summary || {};
    var completedDetails = data.completed_order_details || [];
    var issues = (data.errors || []).concat(data.warnings || []);
    result.hidden = false;
    result.dataset.datasetId = data.dataset_id;
    result.innerHTML = '<div class="import-validation-head"><b>' + (data.valid ? '数据校验通过' : '数据校验未通过') + '</b><span>' + esc(data.dataset_id) + '</span></div>' +
      '<div class="import-summary"><div><b>' + (summary.orders_total || 0) + '</b><span>订单总数</span></div>' +
      '<button type="button" class="completed-filter-trigger" aria-expanded="false" title="筛除口径：订单信息 Sheet 的结束码等于已结束。点击查看订单明细"><b>' + (summary.completed_orders || 0) + '</b><span>已完成筛除</span><small>点击查看原因</small></button>' +
      '<div><b>' + (summary.unfinished_orders || 0) + '</b><span>进入排产</span></div></div>' +
      '<div class="completed-order-details" hidden><div class="completed-detail-head"><b>筛除依据与订单清单</b><span>仅筛除“结束码＝已结束”的订单</span></div>' +
      (completedDetails.length ? completedDetails.map(function (item) {
        return '<div class="completed-detail-row"><div><b>' + esc(item.order_id) + '</b><span>' + esc(item.product_name || '品名未填写') + ' · ' + esc(item.spec || '规格未填写') + '</span></div><div><b>结束码：' + esc(item.finish_code) + '</b><span>' + esc(item.reason) + (item.due_date ? ' · 原预发货日 ' + esc(item.due_date) : ' · 原预发货日未填写') + '</span></div></div>';
      }).join('') : '<p class="module-note">本次上传未返回已完成订单明细。</p>') + '</div>' +
      (issues.length ? '<ul class="backend-issues">' + issues.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>' : '<p class="validation-ok">核心 Sheet 与字段完整，可确认并运行算法。</p>');
    actions.hidden = false;
    var confirmed = /confirmed|running|ready/.test(data.status || '');
    document.querySelector('#confirmDatasetBtn').disabled = !data.valid || confirmed;
    document.querySelector('#confirmDatasetBtn').textContent = confirmed ? '已确认' : '确认使用此数据';
    document.querySelector('#runScheduleBtn').disabled = !confirmed || data.status === 'running';
    document.querySelector('#scheduleRunStatus').textContent = data.valid ? (confirmed ? '数据已确认，可开始智能排产' : '等待计划员确认数据版本') : '请修正文件后重新上传';
    renderProgress(state.scheduleStatus);
  }
  function renderProgress(data) {
    if (!data) return;
    var status = document.querySelector('#scheduleRunStatus');
    var progress = document.querySelector('#scheduleProgress');
    var run = document.querySelector('#runScheduleBtn');
    var percent = Math.max(0, Math.min(100, Number(data.progress) || 0));
    if (status) status.textContent = data.error ? '排产失败：' + data.error : (data.stage || '等待排产') + ' · ' + Math.round(percent) + '%';
    if (progress) { progress.hidden = !data.building && !data.ready; progress.querySelector('i').style.transform = 'scaleX(' + (percent / 100) + ')'; }
    if (run) {
      run.disabled = !!data.building;
      run.textContent = data.building ? '排产计算中…' : (data.ready ? '重新排产' : '开始智能排产');
    }
  }
  function uploadFiles(files) {
    ensureUploadControls();
    var pair;
    try { pair = pickFiles(files); } catch (error) { toast(error.message); return; }
    var hint = document.querySelector('#fileHint');
    var result = document.querySelector('#importResult');
    if (hint) hint.textContent = '正在上传并校验：' + pair.orders.name + '、' + pair.rated.name;
    if (result) { result.hidden = false; result.innerHTML = '<p>正在读取 Sheet、字段和订单状态…</p>'; }
    var form = new FormData();
    form.append('orders_file', pair.orders);
    form.append('rated_file', pair.rated);
    jsonFetch('/api/datasets/upload', { method: 'POST', body: form }).then(function (data) {
      state.pendingDataset = data;
      state.scheduleStatus = null;
      saveDatasetState();
      renderValidation(data);
      if (hint) hint.textContent = '已上传：' + data.source_files.join('、');
      toast(data.valid ? 'Excel 校验通过，请确认数据版本' : 'Excel 校验未通过');
    }).catch(function (error) {
      if (result) result.innerHTML = '<p class="danger">上传失败：' + esc(error.message) + '</p>';
      if (hint) hint.textContent = '上传失败，请检查服务和文件格式';
    });
  }
  function confirmDataset(button) {
    if (!state.pendingDataset) return;
    button.disabled = true;
    jsonFetch('/api/datasets/' + encodeURIComponent(state.pendingDataset.dataset_id) + '/confirm', { method: 'POST' }).then(function () {
      state.pendingDataset.status = 'confirmed';
      saveDatasetState();
      document.querySelector('#runScheduleBtn').disabled = false;
      document.querySelector('#scheduleRunStatus').textContent = '数据已确认，可开始智能排产';
      button.textContent = '已确认';
      toast('企业数据版本已确认');
    }).catch(function (error) {
      button.disabled = false;
      document.querySelector('#scheduleRunStatus').textContent = '确认失败：' + error.message;
    });
  }
  function pollSchedule() {
    clearTimeout(state.pollTimer);
    jsonFetch('/api/schedule/status').then(function (data) {
      state.scheduleStatus = data;
      if (state.pendingDataset && data.dataset_id === state.pendingDataset.dataset_id) state.pendingDataset.status = data.ready ? 'ready' : (data.building ? 'running' : state.pendingDataset.status);
      saveDatasetState();
      renderProgress(data);
      var status = document.querySelector('#scheduleRunStatus');
      var run = document.querySelector('#runScheduleBtn');
      if (status) status.textContent = data.stage + ' · ' + Math.round(data.progress || 0) + '%';
      if (data.error) throw new Error(data.error);
      if (data.ready) {
        if (run) { run.disabled = false; run.textContent = '重新排产'; }
        if (status) status.textContent = '排产完成，结果已刷新';
        fetchDashboard(3, false);
        toast('智能排产完成');
        return;
      }
      state.pollTimer = setTimeout(pollSchedule, 2000);
    }).catch(function (error) {
      var status = document.querySelector('#scheduleRunStatus');
      var run = document.querySelector('#runScheduleBtn');
      if (status) status.textContent = '排产失败：' + error.message;
      if (run) run.disabled = false;
    });
  }
  function runSchedule(button) {
    button.disabled = true;
    button.textContent = '排产计算中…';
    if (state.pendingDataset) state.pendingDataset.status = 'running';
    saveDatasetState();
    jsonFetch('/api/schedule/run', { method: 'POST' }).then(pollSchedule).catch(function (error) {
      button.disabled = false;
      button.textContent = '开始智能排产';
      document.querySelector('#scheduleRunStatus').textContent = '提交失败：' + error.message;
    });
  }

  function postReplan(events, box) {
    setModeBadge('算法重排中…', false);
    jsonFetch('/api/replan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: events }) }).then(function (data) {
      state.lastReplan = data;
      setModeBadge('已接入后端引擎', true);
      var rec = data.recommendation || {};
      var html = '<div class="scenario-impact"><b>算法重排完成（双方案）</b><ul><li>推荐：<b>' + esc(rec.option || '—') + '</b> — ' + esc(rec.reason || '') + '</li>';
      (data.options || []).forEach(function (option) {
        var impact = option.impact || {};
        html += '<li>' + esc(option.name) + '：扰动 <b>' + (impact.moved_orders || 0) + '</b> 单，新增超期 <b>' + (impact.newly_late || 0) + '</b> 单 <button class="primary-button bridge-apply" data-opt="' + esc(option.option_id) + '" type="button">应用该方案</button></li>';
      });
      if (box) box.innerHTML = html + '</ul></div>';
    }).catch(function (error) { if (box) box.innerHTML = '<p class="danger">算法重排失败：' + esc(error.message) + '</p>'; });
  }

  window.requestRushOrderCandidate = function (payload) {
    setModeBadge('急单确定性试排中…', false);
    return jsonFetch('/api/replan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [{
        type: 'insert', oid: payload.orderId, name: payload.name || '人工紧急插单',
        spec_raw: payload.spec, qty_m: Number(payload.quantity), qty_kg: Number(payload.qtyKg || 0),
        due: payload.due
      }] })
    }).then(function (data) {
      state.lastReplan = data;
      setModeBadge('急单候选已生成', true);
      return data;
    }).catch(function (error) {
      setModeBadge('急单试排失败', false);
      throw error;
    });
  };

  window.applyRushOrderCandidate = function (candidateVersion, optionId, confirmedBy, reason) {
    setModeBadge('正在发布正式排程…', false);
    return jsonFetch('/api/replan/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_version: candidateVersion, option_id: optionId,
        confirmed_by: confirmedBy, reason: reason })
    }).then(function (data) {
      applyDashboard(data.dashboard);
      fetchAnalysis();
      setModeBadge('正式排程已发布', true);
      return data;
    }).catch(function (error) {
      setModeBadge('正式排程发布失败', false);
      throw error;
    });
  };

  document.addEventListener('change', function (event) {
    if (event.target && event.target.id === 'dataInput') {
      event.stopImmediatePropagation();
      uploadFiles(event.target.files);
    }
  }, true);
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var confirm = target.closest('#confirmDatasetBtn');
    if (confirm) { confirmDataset(confirm); return; }
    var completedTrigger = target.closest('.completed-filter-trigger');
    if (completedTrigger) {
      var details = document.querySelector('.completed-order-details');
      if (details) {
        details.hidden = !details.hidden;
        completedTrigger.setAttribute('aria-expanded', String(!details.hidden));
        completedTrigger.querySelector('small').textContent = details.hidden ? '点击查看原因' : '收起明细';
      }
      return;
    }
    var run = target.closest('#runScheduleBtn');
    if (run) { runSchedule(run); return; }
    var apply = target.closest('.bridge-apply');
    if (apply && state.lastReplan) {
      var option = (state.lastReplan.options || []).filter(function (item) { return item.option_id === apply.dataset.opt; })[0];
      if (option && option.dashboard) { applyDashboard(option.dashboard); toast('已应用' + option.name); }
      return;
    }
    var shutdown = target.closest('#runShutdown');
    if (shutdown && state.connected) {
      var dev = document.querySelector('#shutdownDevice');
      var hours = document.querySelector('#shutdownHours');
      postReplan([{ type: 'downtime', device: dev.value, hours: Number(hours && hours.value) || 8, reason: '设备故障（重排推演）' }], document.querySelector('#scenarioResult'));
      return;
    }
    var material = target.closest('#runMaterial');
    if (material && state.connected) {
      var name = document.querySelector('#materialName');
      var mhrs = document.querySelector('#materialHours');
      var selected = window.selected || {};
      postReplan([{ type: 'material', oid: selected.order || '', hours: Number(mhrs && mhrs.value) || 12, reason: (name && name.value || '物料') + '延迟' }], document.querySelector('#scenarioResult'));
      return;
    }
    var insert = target.closest('#runInsertBaseline');
    if (insert && state.connected) postReplan([{ type: 'insert', spec_raw: '12mm 6*24+FC', qty_m: 2000, qty_kg: 4800, oid: 'INSERT-001', name: '紧急插单' }], document.querySelector('#scenarioResult'));
    setTimeout(ensureUploadControls, 0);
  }, true);

  setInterval(function () { if (state.connected) fetchDashboard(1, true); }, 60000);
  restoreDatasetState();
  function bootstrap() {
    ensureUploadControls();
    fetchDashboard(60);
    jsonFetch('/api/datasets/current').then(function (data) {
      state.pendingDataset = data;
      saveDatasetState();
      ensureUploadControls();
    }).catch(function () {});
    jsonFetch('/api/schedule/status').then(function (data) {
      state.scheduleStatus = data; saveDatasetState(); renderProgress(data);
      if (data.building) pollSchedule();
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
