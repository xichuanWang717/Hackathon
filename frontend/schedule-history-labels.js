(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.formatScheduleCutoffMeta = api.formatScheduleCutoffMeta;
  root.preferredScheduleVersion = api.preferredScheduleVersion;
})(typeof window !== 'undefined' ? window : this, function () {
  function formatScheduleCutoffMeta(snapshot) {
    var dataset = snapshot && (snapshot.dataset || (snapshot.dashboard && snapshot.dashboard.dataset));
    if (!dataset) return '';
    var cutoff = String(dataset.data_cutoff_at || '').replace('T', ' ').slice(0, 16);
    if (!cutoff || dataset.visible_orders === undefined || dataset.visible_orders === null) return '';
    return '数据截止：' + cutoff + ' · 当时可见 ' + dataset.visible_orders + ' 张订单';
  }

  function preferredScheduleVersion(items, planKey) {
    var candidates = (Array.isArray(items) ? items : []).filter(function (item) {
      return item && item.plan_key === planKey && item.schedule_version;
    });
    candidates.sort(function (a, b) {
      var officialA = a.version_type === 'weekly_official' ? 1 : 0;
      var officialB = b.version_type === 'weekly_official' ? 1 : 0;
      if (officialA !== officialB) return officialB - officialA;
      var revisionDiff = Number(b.revision_no || 0) - Number(a.revision_no || 0);
      if (revisionDiff) return revisionDiff;
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
    return candidates.length ? candidates[0].schedule_version : '';
  }

  return {
    formatScheduleCutoffMeta: formatScheduleCutoffMeta,
    preferredScheduleVersion: preferredScheduleVersion
  };
});
