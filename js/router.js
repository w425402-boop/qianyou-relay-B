/**
 * 牵友接力面试 v1.1 · Hash 路由与通用工具（定桩）
 *
 * 归属：M1 工程基座与数据层（A1 / B1）
 * 状态：路由分发器已真实可用（桩状态下页面不白屏），5 个路由处理函数是桩。
 *
 * 契约（CONTRACT.md 第 2.4 条）：
 *   #/discover        发现页
 *   #/detail/:id      活动详情（id 从路径第 3 段取）
 *   #/publish         发布活动
 *   #/chat            消息（支持 #/chat?conv=grp_a01）
 *   #/mine            我的
 *
 * M1 交付要求：
 *   - 把 5 个 routes.* 换成真实实现：各自往 #app 里渲染该页的骨架
 *   - 除 M4 实现详情页前，routes.detail 可先渲染「详情页待 M4 实现」占位，但不能报错
 *   - 保留 dispatch / parseHash / navigate / toast 四个工具，下游模块依赖它们
 */
(function (root) {
  var QY = (root.QY = root.QY || {});
  var stub = QY.seam.stub;

  /** 解析当前 location.hash，返回 { name, param, query } */
  function parseHash(hash) {
    var raw = (hash || '').replace(/^#\/?/, '');
    var qIndex = raw.indexOf('?');
    var query = {};
    if (qIndex >= 0) {
      raw.slice(qIndex + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
      raw = raw.slice(0, qIndex);
    }
    var segs = raw.split('/').filter(Boolean);
    return {
      name: segs[0] || 'discover',
      param: segs[1] || '',
      query: query
    };
  }

  /** 跳转到指定 hash 路由 */
  function navigate(hash) {
    if (typeof location !== 'undefined') {
      location.hash = hash.charAt(0) === '#' ? hash : '#' + hash;
    }
  }

  /** 轻提示，替代 alert。契约禁止阻塞弹窗 */
  function toast(message, ms) {
    var el = typeof document !== 'undefined' ? document.getElementById('qy-toast') : null;
    if (!el) {
      if (typeof console !== 'undefined') console.log('[toast] ' + message);
      return;
    }
    el.textContent = message;
    el.classList.add('is-visible');
    setTimeout(function () { el.classList.remove('is-visible'); }, ms || 2000);
  }

  /** 把某个页面渲染进 #app；渲染抛错时显示可读的桩提示而不是白屏 */
  function renderIntoApp(html) {
    var app = typeof document !== 'undefined' ? document.getElementById('app') : null;
    if (app) app.innerHTML = html;
  }

  /** 路由分发：解析 hash 后调用对应 routes.* 处理函数 */
  function dispatch() {
    if (typeof location === 'undefined') return;
    var route = parseHash(location.hash);
    var handlers = {
      discover: function () { return QY.routes.discover(route); },
      detail: function () { return QY.routes.detail(route.param, route); },
      publish: function () { return QY.routes.publish(route); },
      chat: function () { return QY.routes.chat(route); },
      mine: function () { return QY.routes.mine(route); }
    };
    var handler = handlers[route.name] || handlers.discover;
    if (typeof QY.routes[route.name] !== 'function') {
      renderIntoApp('<p class="qy-placeholder">未知路由 #/' + route.name + '，已回退到发现页</p>');
      return;
    }
    try {
      handler();
    } catch (err) {
      // 桩状态下这是正常现象：把「哪个函数还没实现」直接摆到页面上
      var isSeam = err && err.message && err.message.indexOf('[SEAM 未实现]') === 0;
      renderIntoApp(
        '<div class="qy-seam-notice' + (isSeam ? '' : ' qy-error') + '">' +
        '<strong>' + (isSeam ? '本页尚未实现（定桩状态）' : '运行出错') + '</strong>' +
        '<pre>' + String(err && err.message ? err.message : err) + '</pre>' +
        '<p>路由：<code>#/' + route.name + (route.param ? '/' + route.param : '') + '</code></p>' +
        '</div>'
      );
      if (typeof console !== 'undefined') console.warn('[router] 渲染失败：', err);
    }
  }

  QY.routes = {
    // TODO(M1): 渲染发现页骨架，至少一个 id="activity-list" 的容器（契约约定的跨模块 DOM 锚点）
    discover: stub('M1 QY.routes.discover', '往 #app 渲染发现页骨架，必须包含 #activity-list 与 #recommend-slot'),

    // TODO(M1): 渲染详情页。M4 之前允许只显示「详情页待 M4 实现」，但不得抛错。
    detail: stub('M1 QY.routes.detail', '入参 id:string，渲染详情页骨架；M4 之前显示占位文字即可'),

    // TODO(M1): 渲染发布页骨架
    publish: stub('M1 QY.routes.publish', '往 #app 渲染发布页骨架，包含表单容器 #publish-form'),

    // TODO(M1): 渲染消息页骨架。route.query.conv 有值时先打开该会话。
    chat: stub('M1 QY.routes.chat', '往 #app 渲染消息页骨架，包含 #conv-list 与 #chat-window'),

    // TODO(M1): 渲染我的页骨架
    mine: stub('M1 QY.routes.mine', '往 #app 渲染我的页骨架，包含 #profile-card')
  };

  QY.router = {
    parseHash: parseHash,
    navigate: navigate,
    toast: toast,
    renderIntoApp: renderIntoApp,
    dispatch: dispatch
  };

  // 与契约表命名对齐的挂载点
  QY.parseHash = parseHash;
  QY.navigate = navigate;
  QY.toast = toast;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = QY.router;
  }
})(typeof window !== 'undefined' ? window : globalThis);
