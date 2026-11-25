/**
 * 牵友接力面试 v1.1 · 全链路联调（定桩）
 *
 * 归属：A7（兼做）/ B8  分支：seat/a7-m7m8、seat/b8-m8
 * 这是最后一棒唯一允许跨模块写的地方：把七个模块串成主流程 6 步。
 *
 * 主流程 6 步：
 *   1. 发现页能看到活动列表（M2）
 *   2. 推荐区给出今日最佳 Top3（M3）
 *   3. 点进详情页，报名后人数 +1，刷新仍在（M4）
 *   4. 发布一条新活动，发现列表 +1，能进新详情页（M5）
 *   5. 消息页能开会话、发消息、未读清零（M6）
 *   6. 我的页资料可编辑保存，管理面板可切换活动状态（M7/M8）
 */
(function (root) {
  var QY = (root.QY = root.QY || {});
  var stub = QY.seam.stub;

  QY.runIntegrationCheck = stub('INTEGRATION runIntegrationCheck', '依次跑主流程 6 步，每步返回 {step, ok, detail}，供 tests/check.js 调用');

  if (typeof module !== 'undefined' && module.exports) { module.exports = QY; }
})(typeof window !== 'undefined' ? window : globalThis);