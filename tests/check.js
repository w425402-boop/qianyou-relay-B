/**
 * 牵友接力面试 v1.1 · 闸门一：功能闸门 (tests/check.js)
 *
 * 跑法：node tests/check.js
 *   · 纯 Node、零依赖、不装任何包
 *   · 每行一条 [PASS] / [FAIL] / [SKIP]，末尾出契约实现进度仪表盘 + 汇总
 *
 * ===========================================================================
 * 【这是跨棒累积文件 —— 本文件位于 OWNERS.json 的 globalAppendOnly】
 *   每棒只许在文件最末尾的「各棒追加区」里新增自己的断言区块；
 *   不许改动、删除、重排任何人已经写下的内容。
 *   tests/contract.js 会对着 git diff 检查本文件有没有删除行，有就判违规。
 *   所以：M2–M8 的骨架是「写给你看该怎么写」的样例注释，
 *        不是让你取消注释的开关 —— 取消注释 = 删掉 `//` 行 = 被闸门拦下。
 *        正确做法：把样例抄进文件末尾的追加区，写成你自己的区块。
 *
 *   仪表盘与汇总走 process 退出钩子，排在所有追加区块之后打印，
 *   所以追加区永远在文件最后一行也没关系。
 * ===========================================================================
 *
 * 桩没实现的函数一律 [SKIP]，不计 FAIL —— 下游可以放心在自己那一棒开工。
 * 桩 / 真实现的判定统一走 QY.seam.isStub()。
 */
'use strict';

var path = require('path');
var helpers = require(path.join(__dirname, 'helpers.js'));

// ---------------------------------------------------------------------------
// 0. 装载 App
// ---------------------------------------------------------------------------
helpers.resetStats();
helpers.section('牵友 · 功能闸门（M1–M8 断言 + 桩状态降级）');

var QY = helpers.loadApp(path.join(__dirname, '..'));
var loadReport = helpers.loadState();
var win = helpers.getWindow();

console.log(' 站点根目录：' + loadReport.root);
console.log(' 已加载：' + (loadReport.loaded.join(', ') || '（无）'));
if (loadReport.missing.length) {
  console.log(' 缺件：' + loadReport.missing.join(', '));
}
if (loadReport.optionalMissing.length) {
  console.log(' 可选件缺失：' + loadReport.optionalMissing.join(', '));
}
if (loadReport.failed.length) {
  console.log(' 加载抛错：' + loadReport.failed.map(function (f) {
    return f.file + ' -> ' + helpers.errorText({ error: f.error });
  }).join(' | '));
}

// js/seam.js 是出题方预置的定桩工具箱，它不在就没法判定桩状态，直接收工
if (!QY || !QY.seam || typeof QY.seam.audit !== 'function') {
  helpers.check('js/seam.js 已就位（定桩工具箱）', false, 'seam/js/seam.js 缺失或未挂到 QY.seam');
  var fatal = helpers.summary();
  process.exit(fatal.fail > 0 ? 1 : 0);
}
helpers.check('js/seam.js 已就位（定桩工具箱，' + QY.seam.REQUIRED_EXPORTS.length + ' 条契约函数清单）', true);

// ===========================================================================
// [M1] 工程基座与数据层（A1 / B1 负责）
// ===========================================================================

helpers.section('[M1] 工程基座与数据层（A1 / B1 负责）');

// --- M1-1: window.QY 已定义 -------------------------------------------------
helpers.check(
  'M1-1: window.QY 已定义且为对象，所有模块挂在同一个命名空间上',
  win && typeof win.QY === 'object' && win.QY !== null && win.QY === QY,
  'window.QY = ' + typeof (win && win.QY)
);

// --- M1-2 / M1-3: 种子数据 ---------------------------------------------------
var seedBlocked = helpers.firstBlocker(['store.load']);
if (seedBlocked) {
  helpers.skip('M1-2: 种子活动不少于 30 条且 13 项字段齐全', seedBlocked);
  helpers.skip('M1-3: 分类不少于 6 个且种子用户不少于 8 位', seedBlocked);
} else {
  var seedCall = helpers.attempt(function () { return QY.store.load(); });

  if (!seedCall.ok) {
    // store.load 还在抛错：桩的 SEAM 错误降级成 SKIP，别的错误算 FAIL
    if (seedCall.isSeam) {
      helpers.skip('M1-2: 种子活动不少于 30 条且 13 项字段齐全', '桩未实现：M1 QY.store.load');
      helpers.skip('M1-3: 分类不少于 6 个且种子用户不少于 8 位', '桩未实现：M1 QY.store.load');
    } else {
      helpers.check('M1-2: 种子活动不少于 30 条且 13 项字段齐全', false, 'store.load() 抛错：' + helpers.errorText(seedCall));
      helpers.check('M1-3: 分类不少于 6 个且种子用户不少于 8 位', false, 'store.load() 抛错：' + helpers.errorText(seedCall));
    }
  } else {
    var seedState = seedCall.value || {};
    var seedActs = Array.isArray(seedState.activities) ? seedState.activities : [];
    var seedUsers = Array.isArray(seedState.users) ? seedState.users : [];

    // 契约 1.1 规定的 13 个 Activity 必填字段
    var actFields = [
      'id', 'title', 'category', 'desc', 'time', 'place',
      'cost', 'capacity', 'joined', 'hostId', 'status', 'distance', 'tags'
    ];
    var badActs = seedActs.filter(function (act) {
      return !act || !actFields.every(function (k) { return act[k] !== undefined; });
    });

    helpers.check(
      'M1-2: 种子活动不少于 30 条且 13 项字段齐全（实际 ' + seedActs.length + ' 条，字段不全 ' + badActs.length + ' 条）',
      seedActs.length >= 30 && badActs.length === 0,
      badActs.length ? '字段不全的活动：' + badActs.slice(0, 3).map(function (a) { return (a && a.id) || '(无 id)'; }).join(', ') : ''
    );

    var catSet = {};
    seedActs.forEach(function (a) {
      if (a && a.category) catSet[a.category] = true;
    });
    var catCount = Object.keys(catSet).length;
    helpers.check(
      'M1-3: 分类不少于 6 个且种子用户不少于 8 位（实际 ' + catCount + ' 类 / ' + seedUsers.length + ' 人）',
      catCount >= 6 && seedUsers.length >= 8,
      catCount < 6 ? '分类不足，只有：' + Object.keys(catSet).join('、') : ''
    );
  }
}

// --- M1-4: store.load / store.save 往返一致 ----------------------------------
var roundBlocked = helpers.firstBlocker(['store.load', 'store.save']);
if (roundBlocked) {
  helpers.skip('M1-4: store.load / store.save 往返读写一致且 9 项顶层结构完整', roundBlocked);
} else {
  var marker = '闸门往返校验-' + Date.now();
  var roundTrip = helpers.attempt(function () {
    var state = QY.store.load();
    state.activities[0].place = marker;
    QY.store.save(state);
    return QY.store.load();
  });

  if (!roundTrip.ok) {
    if (roundTrip.isSeam) {
      helpers.skip('M1-4: store.load / store.save 往返读写一致且 9 项顶层结构完整', '调用桩时抛错：' + helpers.errorText(roundTrip));
    } else {
      helpers.check('M1-4: store.load / store.save 往返读写一致且 9 项顶层结构完整', false, helpers.errorText(roundTrip));
    }
  } else {
    var back = roundTrip.value || {};
    var topKeys = ['version', 'activities', 'users', 'messages', 'comments', 'conversations', 'favorites', 'follows', 'draft'];
    var haveKeys = topKeys.filter(function (k) {
      return Object.prototype.hasOwnProperty.call(back, k);
    });
    var written = back.activities && back.activities[0] ? back.activities[0].place : undefined;

    helpers.check(
      'M1-4: store.load / store.save 往返读写一致且 9 项顶层结构完整（顶层字段 ' + haveKeys.length + '/9）',
      written === marker && haveKeys.length === 9,
      written !== marker
        ? '写进去的 place 读回来是「' + written + '」'
        : '缺顶层字段：' + topKeys.filter(function (k) { return haveKeys.indexOf(k) === -1; }).join(', ')
    );
  }
}

// --- M1-5: 5 个路由处理函数 --------------------------------------------------
var routeBlocked = helpers.firstBlocker([
  'routes.discover', 'routes.detail', 'routes.publish', 'routes.chat', 'routes.mine'
]);
if (routeBlocked) {
  helpers.skip('M1-5: 5 个标准路由处理函数全部存在', routeBlocked);
} else {
  var routeNames = ['discover', 'detail', 'publish', 'chat', 'mine'];
  var missingRoutes = routeNames.filter(function (r) {
    return !QY.routes || typeof QY.routes[r] !== 'function';
  });
  helpers.check(
    'M1-5: 5 个标准路由处理函数全部存在（discover / detail / publish / chat / mine）',
    missingRoutes.length === 0,
    missingRoutes.length ? '缺：' + missingRoutes.join(', ') : ''
  );
}

// 收尾：把持久化清干净，别把我这一节的脏数据留给后面的追加区块
helpers.resetStorage();
if (!helpers.firstBlocker(['store.load'])) {
  helpers.attempt(function () { return QY.store.load(); });
}

// ===========================================================================
// 退出钩子：仪表盘与汇总排在所有追加区块之后打印
// ===========================================================================

var FINISHED = false;

function finish() {
  if (FINISHED) return process.exitCode || 0;
  FINISHED = true;

  printDashboard();
  var result = helpers.summary();

  if (result.pass === 0 && result.fail === 0) {
    console.log(' 一条断言都没跑？检查 tests/check.js 是不是被改坏了。');
  }
  return result.fail > 0 ? 1 : 0;
}

process.on('exit', function () {
  finish();
});

// 模块里残留的定时器可能拖住事件循环；这个 unref 计时器只负责准时收尾，不拖住进程
var watchdog = setTimeout(function () {
  process.exit(finish());
}, 0);
if (watchdog && typeof watchdog.unref === 'function') watchdog.unref();

// 追加区块里抛错，不能把汇总一起带走：记一条 FAIL 再正常收尾
process.on('uncaughtException', function (err) {
  helpers.check('追加断言区块执行未抛错', false, String((err && err.message) || err).split('\n')[0]);
  process.exit(finish());
});

// ===========================================================================
// 契约实现进度仪表盘 —— 现场老师一眼看进度的那个表
// ===========================================================================

function printDashboard() {
  helpers.section('契约实现进度仪表盘（QY.seam.audit()）');

  var audit;
  try {
    audit = QY.seam.audit();
  } catch (err) {
    console.log(' audit() 自身抛错：' + String((err && err.message) || err));
    return;
  }

  var byModule = {};
  audit.rows.forEach(function (row) {
    var m = row.module || '?';
    if (!byModule[m]) {
      byModule[m] = {
        name: (helpers.MODULES[m] && helpers.MODULES[m].name) || m,
        real: 0, stub: 0, missing: 0, rows: []
      };
    }
    byModule[m][row.state]++;
    byModule[m].rows.push(row);
  });

  console.log(' 契约函数共 ' + audit.total + ' 条：real ' + audit.real + ' · stub ' + audit.stub + ' · missing ' + audit.missing);
  console.log(' 图例：● 已实现  ○ 仍是桩  · 缺失');
  console.log('');

  var pendingModules = [];

  Object.keys(byModule).sort(function (a, b) {
    return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10);
  }).forEach(function (m) {
    var info = byModule[m];
    var total = info.real + info.stub + info.missing;
    var dots = info.rows.map(function (r) {
      return r.state === 'real' ? '●' : (r.state === 'stub' ? '○' : '·');
    }).join('');

    var verdict;
    if (info.real === total) verdict = '已交付';
    else if (info.stub === total) verdict = '全是桩，未开工';
    else if (info.real + info.stub === total) verdict = '部分交付（余下仍是桩）';
    else verdict = '未交付';
    if (info.real !== total) pendingModules.push(m + '(' + info.real + '/' + total + ')');

    console.log(
      ' ' + m + ' ' + pad(info.name, 24) + ' ' + info.real + '/' + total +
      '  ' + dots + '  ' + verdict
    );

    var stillMissing = info.rows.filter(function (r) { return r.state === 'missing'; });
    var stillStub = info.rows.filter(function (r) { return r.state === 'stub'; });

    if (stillMissing.length) {
      console.log('      缺：' + stillMissing.map(function (r) { return r.path; }).join(', '));
    }
    if (stillStub.length) {
      console.log('      桩：' + stillStub.map(function (r) { return r.path; }).join(', '));
    }
  });

  console.log('');
  if (pendingModules.length === 0) {
    console.log(' 8 个模块的契约函数全部落地：' + audit.total + '/' + audit.total);
  } else {
    console.log(' 还缺这些模块：' + pendingModules.join('  '));
  }
  if (audit.missing === audit.total) {
    console.log(' （初始状态：seam 还是空壳，一条真实现都没有。A1/B1 落地 M1 之后这张表会开始变绿。）');
  }
}

function pad(text, width) {
  var s = String(text);
  var len = 0;
  for (var i = 0; i < s.length; i++) {
    len += s.charCodeAt(i) > 255 ? 2 : 1; // 中文按等宽 2 列算，避免表格错位
  }
  var fill = Math.max(0, width - len);
  return s + new Array(fill + 1).join(' ');
}

// ===========================================================================
// [M2] 发现页（A2 / B2 负责）
// ---------------------------------------------------------------------------
// TODO(A2/B2)：本段由 M2 负责追加 3 条断言，写进文件末尾的追加区：
//   M2-1  分类筛选计数：QY.filterActivities(列表, {category:'美食'}) 的条数 === 手算期望
//   M2-2  费用筛选计数：{cost:'免费'} 的结果全部 cost === 0，且条数 === 手算期望
//   M2-3  搜索结果：QY.searchActivities(列表, 'brunch') 命中 1 条、大小写不敏感；
//                   火星关键词返回 0 条
// 写法样例见文件末尾「各棒追加区」里的 M2 骨架。
// ===========================================================================

// ===========================================================================
// [M3] 推荐与附近（A3 / B3 负责）
// ---------------------------------------------------------------------------
// TODO(A3/B3)：本段由 M3 负责追加 3 条断言：
//   M3-1  确定性：同一份种子数据调用两次 QY.topRecommendations(3)，结果 JSON 完全一致
//   M3-2  手算抽查：QY.recommendScore(指定活动, u01) === 手算分（40/30/30 权重）
//   M3-3  附近列表 QY.getNearbyActivities() 严格按 distance 升序
// ===========================================================================

// ===========================================================================
// [M4] 活动详情与报名（A4 / B4 负责）
// ---------------------------------------------------------------------------
// TODO(A4/B4)：本段由 M4 负责追加 3 条断言：
//   M4-1  报名成功：joined + 1 且 signedUserIds 含 u01
//   M4-2  满员拦截：joined === capacity 时报名返回 ok:false / reason:'人数已满'
//   M4-3  取消报名：joined 回到原值且 signedUserIds 移除 u01；空评论被拦
// ===========================================================================

// ===========================================================================
// [M5] 发布活动（A5 / B5 负责）
// ---------------------------------------------------------------------------
// TODO(A5/B5)：本段由 M5 负责追加 2 条断言：
//   M5-1  非法输入（空标题 / 过去时间 / 人数 51 / 费用 -5）QY.validatePublish 全部返回 false
//   M5-2  合法输入返回 true，草稿可存可读，发布后活动列表 +1
// ===========================================================================

// ===========================================================================
// [M6] 消息与聊天（A6 / B6 负责）
// ---------------------------------------------------------------------------
// TODO(A6/B6)：本段由 M6 负责追加 2 条断言：
//   M6-1  连发 3 条消息：store.messages 长度 +3；空消息 / 纯空格被拒
//   M6-2  预置未读 > 0，openConversation 之后 unread 清零
// ===========================================================================

// ===========================================================================
// [M7] 我的与个人资料（A7 / B7 负责）
// ---------------------------------------------------------------------------
// TODO(A7/B7)：本段由 M7 负责追加 2 条断言：
//   M7-1  年龄填 200 保存被拦；合法资料保存后重新读回逐字段一致
//   M7-2  「我参与的」只含 u01 报过名的活动；收藏 toggle 两次回到原状态
// ===========================================================================

// ===========================================================================
// [M8] 管理与收尾联调（A7 / B8 负责）
// ---------------------------------------------------------------------------
// TODO(A7/B8)：本段由 M8 负责追加 2 条断言：
//   M8-1  toggleActivityStatus 切 ended 后已结束活动禁止报名，切回 ongoing 恢复
//   M8-2  主流程 6 步端到端：发现 -> 详情 -> 报名 -> 发布 -> 群聊发消息 -> 我的参与
// ===========================================================================

// ===========================================================================
// ===========================================================================
// 各棒追加区 —— 从这里往下追加，别动上面的任何一行
// ===========================================================================
// ===========================================================================
//
// 追加规矩（tests/contract.js 会查）：
//   1. 只在这个区块里加自己的断言，区块标题写清模块号与座位号。
//   2. 不许删除、改写、重排别人的内容 —— 删一行就是一次 appendOnly 违规。
//   3. 依赖桩函数时，先用 helpers.firstBlocker([...]) 判一下；
//      返回非空就直接 helpers.skip(...)，别让桩把整段脚本炸了。
//   4. 断言标题一律「M<模块号>-<序号>: ...」开头，方便老师顺着表看。
//   5. 不要在这里调 process.exit —— 汇总走退出钩子，你提前退出就把别人的结果吞了。
//
// ---------------------------------------------------------------------------
// 样例（照着写，不要去取消注释上面的骨架 —— 抄到这里改成你自己的一节）：
//
// // ===== [M2] 发现页（A2 负责，2026-XX-XX 追加）=====
// helpers.section('[M2] 发现页（A2 负责）');
//
// var blockedM2 = helpers.firstBlocker(['filterActivities', 'searchActivities']);
// if (blockedM2) {
//   helpers.skip('M2-1: 分类筛选计数与手算期望一致', blockedM2);
//   helpers.skip('M2-2: 费用筛选「免费」不含任何付费活动', blockedM2);
//   helpers.skip('M2-3: 搜索大小写不敏感且空匹配返回 0 条', blockedM2);
// } else {
//   var seedM2 = helpers.attempt(function () { return QY.store.load(); });
//   var list = seedM2.ok ? seedM2.value.activities : [];
//   var food = QY.filterActivities(list, { category: '美食', cost: '全部', availability: '全部' });
//   var free = QY.filterActivities(list, { category: '全部', cost: '免费', availability: '全部' });
//   var hit = QY.searchActivities(list, 'brunch');
//   helpers.check('M2-1: 分类筛选计数与手算期望一致（美食 ' + food.length + ' 条）', food.length === 6);
//   helpers.check('M2-2: 费用筛选「免费」不含任何付费活动', free.every(function (a) { return a.cost === 0; }));
//   helpers.check('M2-3: 搜索大小写不敏感且空匹配返回 0 条',
//     hit.length === 1 && QY.searchActivities(list, '火星词XYZ').length === 0);
// }
// ---------------------------------------------------------------------------

// ===== 以下为本轮各棒追加的断言区块（按合并顺序，最新在最下面）=====
