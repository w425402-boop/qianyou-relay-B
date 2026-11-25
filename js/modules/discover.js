/**
 * 牵友接力面试 v1.1 · M2 发现页（定桩）
 *
 * 归属：M2（A2 / B2）  分支：seat/a2-m2、seat/b2-m2
 * 只许改本文件；样式只许往 css/style.css 末尾追加；断言只许往 tests/check.js 末尾追加。
 *
 * 交付要求（详见 cards/A2-M2.md）：
 *   - renderDiscover：卡片 6 项（标题/时间/地点/费用/人数/分类），默认按 time 升序
 *   - filterActivities：分类 + 费用区间 + 人数状态，两个条件可叠加
 *   - searchActivities：标题或地点包含匹配，不区分大小写
 */
(function (root) {
  var QY = (root.QY = root.QY || {});
  var stub = QY.seam.stub;

  QY.renderDiscover = stub('M2 QY.renderDiscover', '渲染发现页列表到 #activity-list，含分类栏/筛选/搜索/排序');

  QY.filterActivities = stub('M2 QY.filterActivities', '入参 (list:Activity[], cond:{category,cost,availability})，返回过滤后的数组');

  QY.searchActivities = stub('M2 QY.searchActivities', '入参 (list:Activity[], keyword:string)，标题或地点包含匹配，返回数组');

  if (typeof module !== 'undefined' && module.exports) { module.exports = QY; }
})(typeof window !== 'undefined' ? window : globalThis);