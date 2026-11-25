/**
 * 牵友接力面试 v1.1 · M5 发布活动（定桩）
 *
 * 归属：M5（A5 / B5）  分支：seat/a5-m5、seat/b5-m5
 *
 * 交付要求（详见 cards/A5-M5.md）：
 *   - renderPublish：7 字段表单（标题/分类/时间/地点/费用/人数上限/描述）
 *   - validatePublish(fields)：7 条校验，逐条不过就标红该字段；返回 {ok:boolean, errors:object}
 *     标题 2–20 字、分类必选、时间晚于现在、地点必填、费用数字≥0、人数整数 2–50、描述≤200 字
 *   - 草稿：30 秒自动保存 + 手动保存，存 store.draft；刷新后提示恢复
 *   - 发布：id = 'a' + 时间戳，status=ongoing，joined=0，hostId='u01'，成功后跳 #/detail/:id
 */
(function (root) {
  var QY = (root.QY = root.QY || {});
  var stub = QY.seam.stub;

  QY.renderPublish = stub('M5 QY.renderPublish', '渲染发布表单到 #publish-form，绑定 7 字段校验与草稿');

  QY.validatePublish = stub('M5 QY.validatePublish', '入参 fields:{title,category,time,place,cost,capacity,desc}，返回 {ok,errors}');

  if (typeof module !== 'undefined' && module.exports) { module.exports = QY; }
})(typeof window !== 'undefined' ? window : globalThis);