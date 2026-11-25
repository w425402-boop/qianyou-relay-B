/**
 * 牵友接力面试 v1.1 · 闸门共用垫片 (tests/helpers.js)
 *
 * 【本文件由出题方预置，属于冻结文件，任何棒次不得修改】
 *
 * 职责：
 *   1. 内存版 localStorage —— 让 js/store.js 在纯 Node 里跑得起来
 *   2. loadApp(rootDir) —— 按 index.html 的加载顺序 require 全部 js 文件
 *   3. 极简 DOM 垫片 —— 不渲染，只保证「碰 DOM 不抛错」，让模块逻辑能在 Node 里跑通
 *   4. 断言工具 check / skip / summary —— 纯零依赖，累积 pass / fail / skip
 *
 * 设计原则：永远不抛错。闸门脚本自己挂掉，比闸门报红更糟。
 */
'use strict';

var fs = require('fs');
var path = require('path');

// ---------------------------------------------------------------------------
// 模块清单与元数据
// ---------------------------------------------------------------------------

/**
 * 加载顺序 —— 与 index.html 的 <script> 顺序严格一致。
 * js/seam.js 永远最先（定桩工具箱必须在任何模块之前就位）。
 * js/modules/integration.js 是 A7 / B8 的联调文件，属于可选件，缺失不记为缺件。
 */
var APP_FILES = [
  'js/seam.js',
  'js/data.js',
  'js/store.js',
  'js/router.js',
  'js/modules/discover.js',
  'js/modules/recommend.js',
  'js/modules/detail.js',
  'js/modules/publish.js',
  'js/modules/chat.js',
  'js/modules/mine.js',
  'js/modules/admin.js',
  'js/modules/integration.js'
];

/** 可选文件：允许不存在，不算缺件 */
var OPTIONAL_FILES = ['js/modules/integration.js'];

/** 模块编号 -> 名称 + 归属文件 */
var MODULES = {
  M1: { name: '工程基座与数据层', files: ['js/data.js', 'js/store.js', 'js/router.js'] },
  M2: { name: '发现页', files: ['js/modules/discover.js'] },
  M3: { name: '推荐与附近', files: ['js/modules/recommend.js'] },
  M4: { name: '活动详情与报名', files: ['js/modules/detail.js'] },
  M5: { name: '发布活动', files: ['js/modules/publish.js'] },
  M6: { name: '消息与聊天', files: ['js/modules/chat.js'] },
  M7: { name: '我的与个人资料', files: ['js/modules/mine.js'] },
  M8: { name: '管理与收尾联调', files: ['js/modules/admin.js', 'js/modules/integration.js'] }
};

/** 模块编号 -> 该模块的 js 文件（供契约闸门的「回退成桩」检测用） */
var MODULE_FILES = (function () {
  var map = {};
  Object.keys(MODULES).forEach(function (k) {
    map[k] = MODULES[k].files.slice();
  });
  return map;
})();

/** 默认根目录：tests/ 的上一级 */
var DEFAULT_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. 内存版 localStorage
// ---------------------------------------------------------------------------

function createLocalStorage() {
  var data = Object.create(null);

  var api = {
    getItem: function (k) {
      var key = String(k);
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem: function (k, v) {
      data[String(k)] = String(v);
    },
    removeItem: function (k) {
      delete data[String(k)];
    },
    clear: function () {
      Object.keys(data).forEach(function (k) { delete data[k]; });
    },
    key: function (i) {
      var keys = Object.keys(data);
      return i >= 0 && i < keys.length ? keys[i] : null;
    },
    // 调试辅助（非标准 API，闸门自用）
    __dump: function () {
      var out = {};
      Object.keys(data).forEach(function (k) { out[k] = data[k]; });
      return out;
    },
    __seed: function (obj) {
      Object.keys(obj || {}).forEach(function (k) { data[String(k)] = String(obj[k]); });
    }
  };

  Object.defineProperty(api, 'length', {
    get: function () { return Object.keys(data).length; }
  });

  return api;
}

// ---------------------------------------------------------------------------
// 2. 极简 DOM 垫片
// ---------------------------------------------------------------------------

/**
 * 未知属性兜底：既能当值读、也能当函数调、也能继续向下点，永不抛错。
 * 用于 DOM 垫片没显式实现的长尾成员（animate / setAttributeNS / matches 之类）。
 */
function makeLazy(propName) {
  var name = String(propName || 'lazy');
  var fn = function () { return makeLazy(name + '()'); };

  return new Proxy(fn, {
    get: function (target, prop) {
      if (prop === Symbol.toPrimitive) return function () { return ''; };
      if (prop === Symbol.iterator) return function () { return [][Symbol.iterator](); };
      if (prop === 'toString' || prop === 'valueOf' || prop === 'toJSON') {
        return function () { return ''; };
      }
      if (prop === 'then') return undefined; // 别被当成 Promise
      if (prop === 'length') return 0;
      if (prop === 'nodeType') return 1;
      return makeLazy(name + '.' + String(prop));
    },
    apply: function () { return makeLazy(name + '()'); },
    construct: function () { return makeLazy('new ' + name); },
    set: function () { return true; },
    has: function () { return true; }
  });
}

function noop() {}
function returnFalse() { return false; }
function returnTrue() { return true; }

function makeClassList() {
  var set = Object.create(null);
  return {
    add: function () {
      for (var i = 0; i < arguments.length; i++) set[String(arguments[i])] = true;
    },
    remove: function () {
      for (var i = 0; i < arguments.length; i++) delete set[String(arguments[i])];
    },
    toggle: function (name, force) {
      var k = String(name);
      var shouldAdd = force === undefined ? !set[k] : Boolean(force);
      if (shouldAdd) set[k] = true; else delete set[k];
      return shouldAdd;
    },
    contains: function (name) { return Boolean(set[String(name)]); },
    replace: function (a, b) {
      if (set[String(a)]) { delete set[String(a)]; set[String(b)] = true; return true; }
      return false;
    },
    item: function (i) {
      var keys = Object.keys(set);
      return i >= 0 && i < keys.length ? keys[i] : null;
    },
    get length() { return Object.keys(set).length; },
    toString: function () { return Object.keys(set).join(' '); }
  };
}

/**
 * 创建一个假元素。所有 DOM 操作都是安全的空操作，属性可随意读写。
 */
function createElementShim(tagName) {
  var tag = String(tagName || 'div');
  var extras = Object.create(null);

  var node = {
    tagName: tag.toUpperCase(),
    nodeName: tag.toUpperCase(),
    nodeType: 1,
    id: '',
    className: '',
    innerHTML: '',
    outerHTML: '',
    innerText: '',
    textContent: '',
    value: '',
    placeholder: '',
    type: '',
    name: '',
    href: '',
    src: '',
    alt: '',
    title: '',
    role: '',
    checked: false,
    selected: false,
    disabled: false,
    hidden: false,
    readOnly: false,
    required: false,
    multiple: false,
    files: [],
    options: [],
    selectedIndex: 0,
    scrollTop: 0,
    scrollLeft: 0,
    offsetWidth: 0,
    offsetHeight: 0,
    offsetTop: 0,
    offsetLeft: 0,
    clientWidth: 0,
    clientHeight: 0,
    scrollHeight: 0,
    children: [],
    childNodes: [],
    parentNode: null,
    parentElement: null,
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,
    dataset: {},
    style: {},
    classList: makeClassList(),

    appendChild: function (child) {
      if (child && typeof child === 'object') {
        node.childNodes.push(child);
        node.children.push(child);
        if ('parentNode' in child) child.parentNode = node;
      }
      return child;
    },
    insertBefore: function (child, ref) { return node.appendChild(child); },
    append: function () {
      for (var i = 0; i < arguments.length; i++) node.appendChild(arguments[i]);
    },
    prepend: function () {},
    removeChild: function (child) {
      node.childNodes = node.childNodes.filter(function (c) { return c !== child; });
      node.children = node.children.filter(function (c) { return c !== child; });
      return child;
    },
    replaceChild: function (next, old) { return node.removeChild(old) && next; },
    remove: noop,
    cloneNode: function () { return createElementShim(tag); },
    contains: returnFalse,
    hasChildNodes: returnFalse,
    setAttribute: function (k, v) { node['attr_' + k] = v; },
    getAttribute: function (k) {
      return Object.prototype.hasOwnProperty.call(node, 'attr_' + k) ? node['attr_' + k] : null;
    },
    setAttributeNS: noop,
    getAttributeNS: function () { return null; },
    removeAttribute: function (k) { delete node['attr_' + k]; },
    hasAttribute: returnFalse,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: returnTrue,
    attachEvent: noop,
    detachEvent: noop,
    focus: noop,
    blur: noop,
    click: noop,
    submit: noop,
    reset: noop,
    select: noop,
    setSelectionRange: noop,
    setCustomValidity: noop,
    checkValidity: returnTrue,
    reportValidity: returnTrue,
    scrollIntoView: noop,
    scrollTo: noop,
    animate: function () { return makeLazy('animation'); },
    insertAdjacentHTML: noop,
    insertAdjacentElement: function (pos, el) { return el; },
    querySelector: function (sel) { return createElementShim('div'); },
    querySelectorAll: function () { return []; },
    getElementsByClassName: function () { return []; },
    getElementsByTagName: function () { return []; },
    closest: function () { return null; },
    matches: returnFalse,
    getBoundingClientRect: function () {
      return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
    },
    getClientRects: function () { return []; },
    removeProperty: function () { return ''; },
    getPropertyValue: function () { return ''; },
    setProperty: noop
  };

  return new Proxy(node, {
    get: function (target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'then') return undefined;
      if (!(prop in extras)) extras[prop] = makeLazy(String(prop));
      return extras[prop];
    },
    set: function (target, prop, value) {
      target[prop] = value;
      return true;
    },
    has: function () { return true; },
    deleteProperty: function (target, prop) {
      delete target[prop];
      return true;
    }
  });
}

/**
 * 假 document。
 * getElementById / querySelector 永远返回一个稳定节点（同一个 id 反复取到同一个节点），
 * 绝不返回 null —— 真实 DOM 返回 null 会让 `document.getElementById('x').innerHTML = ...`
 * 这类写法在 Node 里直接抛 TypeError，而垫片的目的是「不抛错」。
 */
function createDocumentShim() {
  var byId = Object.create(null);
  var bySelector = Object.create(null);
  var extras = Object.create(null);

  function stable(cache, key) {
    if (!cache[key]) cache[key] = createElementShim('div');
    return cache[key];
  }

  var doc = {
    readyState: 'complete',
    hidden: false,
    visibilityState: 'visible',
    title: '牵友 · 线下组局',
    cookie: '',
    URL: 'http://localhost:5173/#/discover',
    referrer: '',
    characterSet: 'UTF-8',
    DOCUMENT_NODE: 9,
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    COMMENT_NODE: 8,

    getElementById: function (id) {
      var el = stable(byId, String(id));
      el.id = String(id);
      return el;
    },
    querySelector: function (sel) { return stable(bySelector, String(sel)); },
    querySelectorAll: function () { return []; },
    getElementsByClassName: function () { return []; },
    getElementsByTagName: function () { return []; },
    getElementsByName: function () { return []; },
    createElement: function (tag) { return createElementShim(tag); },
    createElementNS: function (ns, tag) { return createElementShim(tag); },
    createTextNode: function (text) {
      var n = createElementShim('#text');
      n.nodeType = 3;
      n.textContent = text === null || text === undefined ? '' : String(text);
      return n;
    },
    createDocumentFragment: function () { return createElementShim('#fragment'); },
    createComment: function () { return createElementShim('#comment'); },
    importNode: function (n) { return n; },
    adoptNode: function (n) { return n; },
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: returnTrue,
    write: noop,
    writeln: noop,
    open: noop,
    close: noop,
    execCommand: returnTrue,
    hasFocus: returnTrue,
    contains: returnFalse,
    elementFromPoint: function () { return createElementShim('div'); }
  };

  doc.documentElement = createElementShim('html');
  doc.head = createElementShim('head');
  doc.body = createElementShim('body');
  doc.head.parentNode = doc.documentElement;
  doc.body.parentNode = doc.documentElement;
  doc.documentElement.appendChild(doc.head);
  doc.documentElement.appendChild(doc.body);

  return new Proxy(doc, {
    get: function (target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'then') return undefined;
      if (!(prop in extras)) extras[prop] = makeLazy(String(prop));
      return extras[prop];
    },
    set: function (target, prop, value) {
      target[prop] = value;
      return true;
    },
    has: function () { return true; }
  });
}

// ---------------------------------------------------------------------------
// 3. 浏览器环境安装 / 重置
// ---------------------------------------------------------------------------

var ENV = {
  root: DEFAULT_ROOT,
  report: { root: DEFAULT_ROOT, loaded: [], missing: [], failed: [], optionalMissing: [] },
  alertCalls: [],
  confirmCalls: []
};

/**
 * 往 globalThis 上挂属性。Node 新版把 navigator 一类做成了只读 getter，
 * 直接赋值会抛 TypeError，这里降级用 defineProperty，再不行就安静跳过。
 */
function softDef(g, name, value) {
  try {
    g[name] = value;
    if (g[name] === value) return;
  } catch (err) {
    /* 落到 defineProperty */
  }
  try {
    Object.defineProperty(g, name, {
      value: value,
      writable: true,
      configurable: true,
      enumerable: false
    });
  } catch (err) {
    /* 实在挂不上就算了：垫片宁可缺一个属性，也不能让闸门自己崩掉 */
  }
}

/**
 * 把当前进程伪装成浏览器：window === globalThis，这样模块 IIFE 里
 * `(function (root) {...})(typeof window !== 'undefined' ? window : globalThis)`
 * 无论锚哪一个，拿到的都是同一个对象，QY 一定落在 globalThis.QY 上。
 */
function resetEnv() {
  var g = globalThis;

  g.window = g;
  g.self = g;

  g.localStorage = createLocalStorage();
  g.sessionStorage = createLocalStorage();
  g.document = createDocumentShim();

  softDef(g, 'location', {
    href: 'http://localhost:5173/#/discover',
    hash: '#/discover',
    pathname: '/',
    search: '',
    protocol: 'http:',
    host: 'localhost:5173',
    origin: 'http://localhost:5173',
    reload: noop,
    replace: noop,
    assign: noop,
    toString: function () { return 'http://localhost:5173/#/discover'; }
  });
  g.history = { pushState: noop, replaceState: noop, back: noop, forward: noop, go: noop, length: 1, state: null };
  // Node 22 的 navigator 是只读 getter，必须走 softDef
  softDef(g, 'navigator', {
    userAgent: 'NodeJS/relay-gate',
    language: 'zh-CN',
    languages: ['zh-CN'],
    onLine: false,
    platform: 'relay-gate'
  });
  g.screen = { width: 390, height: 844 };
  g.innerWidth = 390;
  g.innerHeight = 844;
  g.devicePixelRatio = 2;

  g.addEventListener = noop;
  g.removeEventListener = noop;
  g.dispatchEvent = returnTrue;
  g.scrollTo = noop;
  g.scrollBy = noop;
  g.matchMedia = function () {
    return { matches: false, addListener: noop, removeListener: noop, addEventListener: noop, removeEventListener: noop };
  };
  g.getComputedStyle = function () { return {}; };
  g.requestAnimationFrame = returnTrue;
  g.cancelAnimationFrame = noop;
  g.alert = function (msg) { ENV.alertCalls.push(String(msg)); };
  g.confirm = function (msg) { ENV.confirmCalls.push(String(msg)); return false; };
  g.prompt = function () { return ''; };

  // 事件与节点构造函数垫片
  g.Event = function Event(type) { this.type = type; };
  g.CustomEvent = function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; };
  g.HTMLElement = function HTMLElement() {};
  g.Node = function Node() {};
  g.MutationObserver = function MutationObserver() { return { observe: noop, disconnect: noop, takeRecords: function () { return []; } }; };
  g.IntersectionObserver = function IntersectionObserver() { return { observe: noop, unobserve: noop, disconnect: noop }; };
  g.FormData = function FormData() {
    this._d = {};
    this.append = function (k, v) { this._d[k] = v; };
    this.get = function (k) { return this._d[k]; };
    this.has = function (k) { return Object.prototype.hasOwnProperty.call(this._d, k); };
  };
  g.URL = g.URL || require('url').URL;

  ENV.alertCalls = [];
  ENV.confirmCalls = [];

  g.QY = {};
  return g;
}

// ---------------------------------------------------------------------------
// 4. loadApp —— 按 index.html 顺序加载全部脚本
// ---------------------------------------------------------------------------

/**
 * @param {string} [rootDir] 站点根目录（默认 tests/ 的上一级）
 * @returns {object} globalThis.QY
 */
function loadApp(rootDir) {
  var root = rootDir ? path.resolve(String(rootDir)) : DEFAULT_ROOT;
  resetEnv();

  var report = { root: root, loaded: [], missing: [], failed: [], optionalMissing: [] };

  APP_FILES.forEach(function (rel) {
    var abs = path.join(root, rel.split('/').join(path.sep));
    var optional = OPTIONAL_FILES.indexOf(rel) !== -1;

    if (!fs.existsSync(abs)) {
      (optional ? report.optionalMissing : report.missing).push(rel);
      return;
    }
    try {
      var resolved = require.resolve(abs);
      delete require.cache[resolved];
      require(abs);
      report.loaded.push(rel);
    } catch (err) {
      // 单个模块自己炸了，不能带着整个闸门一起沉 —— 记下来，继续加载后面的
      report.failed.push({ file: rel, error: err });
    }
  });

  ENV.root = root;
  ENV.report = report;
  return globalThis.QY;
}

/** 最近一次 loadApp 的装载报告 */
function loadState() {
  return ENV.report;
}

/** 运行时被调用过的 alert / confirm（静态检查之外的第二道观察） */
function runtimePopupCalls() {
  return { alert: ENV.alertCalls.slice(), confirm: ENV.confirmCalls.slice() };
}

/** 取当前环境里的 window（就是 globalThis） */
function getWindow() {
  return globalThis;
}

/** 清空持久化，回到「首次打开 App」的状态 */
function resetStorage() {
  if (globalThis.localStorage && typeof globalThis.localStorage.clear === 'function') {
    globalThis.localStorage.clear();
  }
}

// ---------------------------------------------------------------------------
// 5. 断言工具
// ---------------------------------------------------------------------------

var STATS = { pass: 0, fail: 0, skip: 0 };
var FAILURES = [];

function resetStats() {
  STATS.pass = 0;
  STATS.fail = 0;
  STATS.skip = 0;
  FAILURES = [];
}

/**
 * 一条断言。
 * @param {string} label 断言标题（带 Mx-n 编号）
 * @param {boolean} cond 判定结果
 * @param {string} [detail] 失败时的细节
 */
function check(label, cond, detail) {
  if (cond) {
    STATS.pass++;
    console.log('[PASS] ' + label);
    return true;
  }
  STATS.fail++;
  var line = label + (detail ? ' —— ' + detail : '');
  FAILURES.push(line);
  console.log('[FAIL] ' + line);
  return false;
}

/**
 * 一条跳过。用于「桩还没实现，现在没法验」——不计 FAIL，只记一笔。
 */
function skip(label, reason) {
  STATS.skip++;
  console.log('[SKIP] ' + label + (reason ? ' —— ' + reason : ''));
  return false;
}

function section(title) {
  console.log('');
  console.log('='.repeat(60));
  console.log(' ' + title);
  console.log('='.repeat(60));
}

/**
 * 末尾汇总，并设置 process.exitCode（有 FAIL 才为 1）。
 * @returns {{pass:number, fail:number, skip:number}}
 */
function summary() {
  console.log('');
  console.log('='.repeat(60));
  console.log(' 汇总：PASS = ' + STATS.pass + ' | FAIL = ' + STATS.fail + ' | SKIP = ' + STATS.skip);
  console.log('='.repeat(60));

  if (STATS.fail > 0) {
    console.log('');
    console.log(' 未通过的断言：');
    FAILURES.forEach(function (f) { console.log('   · ' + f); });
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }

  return { pass: STATS.pass, fail: STATS.fail, skip: STATS.skip };
}

function stats() {
  return { pass: STATS.pass, fail: STATS.fail, skip: STATS.skip };
}

// ---------------------------------------------------------------------------
// 6. 与定桩工具箱配合的小工具（check.js / contract.js 共用）
// ---------------------------------------------------------------------------

/** 'QY.store.load' -> 'store.load' */
function barePath(pathStr) {
  return String(pathStr).replace(/^QY\./, '');
}

/** 从 contracted 清单里查某条契约函数属于哪个模块 */
function moduleOf(barePathStr) {
  var QY = globalThis.QY;
  var specs = (QY && QY.seam && QY.seam.REQUIRED_EXPORTS) || [];
  for (var i = 0; i < specs.length; i++) {
    if (specs[i].path === barePathStr) return specs[i].module;
  }
  return '';
}

/** 契约函数的实现状态：'missing' | 'stub' | 'real' */
function implState(pathStr) {
  var QY = globalThis.QY;
  if (!QY || !QY.seam) return 'missing';
  var fn = QY.seam.resolve(barePath(pathStr));
  if (typeof fn !== 'function') return 'missing';
  return QY.seam.isStub(fn) ? 'stub' : 'real';
}

/**
 * 若该函数还没真实现，返回一句人类可读的原因；已实现返回 null。
 * 例：'桩未实现：M3 QY.recommendScore'
 */
function whyBlocked(pathStr) {
  var bare = barePath(pathStr);
  var mod = moduleOf(bare);
  var label = mod ? mod + ' QY.' + bare : 'QY.' + bare;
  var st = implState(bare);
  if (st === 'real') return null;
  if (st === 'stub') return '桩未实现：' + label;
  return '函数缺失：' + label;
}

/**
 * 一串依赖里第一个拦路的。全通返回 null。
 * @param {string[]} paths 例 ['store.load', 'QY.store.save']
 */
function firstBlocker(paths) {
  for (var i = 0; i < paths.length; i++) {
    var why = whyBlocked(paths[i]);
    if (why) return why;
  }
  return null;
}

/** 包一层 try/catch：桩抛出来的 SEAM 错误要认出来，方便降级成 SKIP */
function attempt(fn) {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    return { ok: false, error: err, isSeam: /SEAM 未实现/.test(String(err && err.message)) };
  }
}

/** 把 attempt 的失败翻译成一句话 */
function errorText(result) {
  var err = result && result.error;
  if (!err) return '未知错误';
  return String((err && err.message) || err).split('\n')[0];
}

// ---------------------------------------------------------------------------
// 7. 静态扫描工具（契约闸门用）
// ---------------------------------------------------------------------------

/**
 * 把 JS 源码里的注释替换成空格（保留换行与字符位置），返回 code。
 * 这样 `// 不要直接调 localStorage` 这种注释不会被误判成违规代码。
 * 字符串字面量（' " `）内的内容原样保留，其中的 `//` 不当注释。
 * 已知取舍：模板字符串里 `${...}` 的内插代码会被当成字符串内容（极少见，可接受）。
 */
function stripComments(text) {
  var src = String(text || '');
  var out = '';
  var i = 0;
  var n = src.length;
  var quote = null;

  while (i < n) {
    var ch = src.charAt(i);
    var next = i + 1 < n ? src.charAt(i + 1) : '';

    if (quote) {
      out += ch;
      if (ch === '\\') {
        out += next;
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }

    if (ch === '/' && next === '/') {
      while (i < n && src.charAt(i) !== '\n') { out += ' '; i++; }
      continue;
    }
    if (ch === '/' && next === '*') {
      while (i < n && !(src.charAt(i) === '*' && src.charAt(i + 1) === '/')) {
        out += src.charAt(i) === '\n' ? '\n' : ' ';
        i++;
      }
      out += '  ';
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      i++;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

/** 偏移量 -> 行号（1 基） */
function lineAt(text, offset) {
  var line = 1;
  for (var i = 0; i < offset && i < text.length; i++) {
    if (text.charAt(i) === '\n') line++;
  }
  return line;
}

/** 递归收集 js/ 目录下所有 .js 文件（相对 rootDir 的 posix 路径） */
function listJsFiles(rootDir, subDir) {
  var base = rootDir || DEFAULT_ROOT;
  var start = subDir ? path.join(base, subDir.split('/').join(path.sep)) : path.join(base, 'js');
  var found = [];

  (function walk(dir) {
    var entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      return;
    }
    entries.forEach(function (ent) {
      var abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name.charAt(0) === '.') return;
        walk(abs);
        return;
      }
      if (ent.isFile() && /\.js$/.test(ent.name)) {
        found.push(path.relative(base, abs).split(path.sep).join('/'));
      }
    });
  })(start);

  return found.sort();
}

module.exports = {
  // 常量
  APP_FILES: APP_FILES,
  OPTIONAL_FILES: OPTIONAL_FILES,
  MODULES: MODULES,
  MODULE_FILES: MODULE_FILES,
  DEFAULT_ROOT: DEFAULT_ROOT,

  // 环境与装载
  createLocalStorage: createLocalStorage,
  createDocumentShim: createDocumentShim,
  createElementShim: createElementShim,
  loadApp: loadApp,
  loadState: loadState,
  resetEnv: resetEnv,
  resetStorage: resetStorage,
  runtimePopupCalls: runtimePopupCalls,
  getWindow: getWindow,

  // 断言
  check: check,
  skip: skip,
  section: section,
  summary: summary,
  stats: stats,
  resetStats: resetStats,

  // 定桩配合
  barePath: barePath,
  moduleOf: moduleOf,
  implState: implState,
  whyBlocked: whyBlocked,
  firstBlocker: firstBlocker,
  attempt: attempt,
  errorText: errorText,

  // 静态扫描
  stripComments: stripComments,
  lineAt: lineAt,
  listJsFiles: listJsFiles
};
