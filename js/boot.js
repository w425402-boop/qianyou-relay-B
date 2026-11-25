/**
 * 牵友接力面试 v1.1 · 启动引导（js/boot.js）
 *
 * 【冻结文件 —— 出题方预置，任何棒次不得修改】
 *
 * 职责：
 *   1. 首次进入无 hash 时跳到 #/discover
 *   2. 监听 hashchange，交给 QY.router.dispatch 渲染
 *   3. 渲染顶部「桩状态」面板：把 30 个契约函数分成 已实现 / 仍是桩 / 缺失 三档列出来
 *      —— 这是现场老师一眼看全组进度的仪表盘，也是面试者的自检面板
 */
(function (root) {
  var QY = root.QY || {};
  if (!QY.seam || !QY.router) return;

  /** 把桩状态渲染进顶部面板 */
  function renderSeamPanel() {
    var list = typeof document !== 'undefined' ? document.getElementById('qy-seam-list') : null;
    var summary = typeof document !== 'undefined' ? document.getElementById('qy-seam-summary') : null;
    var badge = typeof document !== 'undefined' ? document.getElementById('qy-seat-badge') : null;
    if (!list) return;

    var report = QY.seam.audit();
    var total = report.total;
    var pct = total ? Math.round((report.real / total) * 100) : 0;

    if (summary) {
      summary.textContent = '已实现 ' + report.real + '/' + total +
        ' · 仍是桩 ' + report.stub + ' · 缺失 ' + report.missing + ' · 进度 ' + pct + '%';
    }
    if (badge) {
      badge.textContent = report.real === total ? '全模块已交付' : '进度 ' + pct + '%';
      badge.className = 'qy-seat-badge' + (report.real === total ? ' is-done' : '');
    }

    var html = '';
    report.rows.forEach(function (row) {
      var cls = row.state === 'real' ? 'is-real' : (row.state === 'stub' ? 'is-stub' : 'is-missing');
      var mark = row.state === 'real' ? '✔' : (row.state === 'stub' ? '○' : '✕');
      html += '<li class="' + cls + '">' +
        '<span class="qy-seam-mark">' + mark + '</span>' +
        '<code>QY.' + row.path + '</code>' +
        '<span class="qy-seam-owner">' + row.module + '</span>' +
        '</li>';
    });
    list.innerHTML = html;
  }

  /** 高亮当前 Tab */
  function syncTabs() {
    if (typeof document === 'undefined' || typeof location === 'undefined') return;
    var route = QY.router.parseHash(location.hash);
    var map = { discover: 'tab-discover', publish: 'tab-publish', chat: 'tab-chat', mine: 'tab-mine' };
    Object.keys(map).forEach(function (key) {
      var el = document.getElementById(map[key]);
      if (!el) return;
      if (key === route.name) el.classList.add('is-active');
      else el.classList.remove('is-active');
    });
  }

  function boot() {
    if (typeof document === 'undefined') return;

    // 顶部按钮：展开/收起桩状态面板
    var btn = document.getElementById('qy-seam-btn');
    var panel = document.getElementById('qy-seam-panel');
    if (btn && panel) {
      btn.addEventListener('click', function () {
        panel.hidden = !panel.hidden;
        if (!panel.hidden) renderSeamPanel();
      });
    }

    // 无 hash 时落到发现页
    if (typeof location !== 'undefined' && !location.hash) {
      location.hash = '#/discover';
      return;
    }

    renderSeamPanel();
    syncTabs();
    QY.router.dispatch();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
    root.addEventListener('hashchange', function () {
      syncTabs();
      QY.router.dispatch();
    });
  }

  QY.boot = { renderSeamPanel: renderSeamPanel, syncTabs: syncTabs };
})(typeof window !== 'undefined' ? window : globalThis);
