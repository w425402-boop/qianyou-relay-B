/**
 * 牵友接力面试 v1.1 · M4 活动详情与报名（定桩）
 *
 * 归属：M4（A4 / B4）  分支：seat/a4-m4、seat/b4-m4
 *
 * 交付要求（详见 cards/A4-M4.md）：
 *   - renderDetail(id)：8 项信息 + 发起人卡片 + 参与者头像列表 + 评论区
 *   - signup(id)：signedUserIds 加 u01，joined+1；满员或已结束要拦
 *   - cancelSignup(id)：signedUserIds 去 u01，joined-1
 *   - 预留「联系发起人」「进群聊」两个按钮，点击跳 #/chat（M6 接线，本棒只保证不报错）
 */
(function (root) {
  var QY = (root.QY = root.QY || {});
  var stub = QY.seam.stub;

  QY.renderDetail = stub('M4 QY.renderDetail', '入参 id:string，渲染详情页 8 项信息 + 参与者 + 评论区');

  QY.signup = stub('M4 QY.signup', '入参 id:string，报名成功返回 true；已满员/已结束返回 false 并 toast 提示');

  QY.cancelSignup = stub('M4 QY.cancelSignup', '入参 id:string，取消报名返回 true；未报名返回 false');

  if (typeof module !== 'undefined' && module.exports) { module.exports = QY; }
})(typeof window !== 'undefined' ? window : globalThis);