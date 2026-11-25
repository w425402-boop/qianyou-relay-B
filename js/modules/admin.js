/**
 * 牵友接力面试 v1.1 · M8 管理与收尾联调（定桩）
 *
 * 归属：M8（A7 兼 / B8）  分支：seat/a7-m7m8、seat/b8-m8
 *
 * A 组（A7 兼做）缩小范围：管理面板只做「活动状态切换 ongoing/ended」，联调与 README 保留。
 * B 组（B8 专职）：状态切换 + README 四项文档 + 全链路 6 步联调报告 + 基座首尾闭环复核。
 *
 * 交付要求（详见 cards/B8-M8.md）：
 *   - renderAdmin：活动列表 + 每行的 ongoing/ended 切换控件
 *   - toggleActivityStatus(id, nextStatus)：切换并持久化
 */
(function (root) {
  var QY = (root.QY = root.QY || {});
  var stub = QY.seam.stub;

  QY.renderAdmin = stub('M8 QY.renderAdmin', '渲染管理面板到 #app：活动列表 + 状态切换控件');

  QY.toggleActivityStatus = stub('M8 QY.toggleActivityStatus', '入参 (id:string, nextStatus:"ongoing"|"ended")，切换并持久化返回 boolean');

  if (typeof module !== 'undefined' && module.exports) { module.exports = QY; }
})(typeof window !== 'undefined' ? window : globalThis);