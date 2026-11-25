/**
 * 牵友接力面试 v1.1 · M3 推荐与附近（定桩）
 *
 * 归属：M3（A3 / B3）  分支：seat/a3-m3、seat/b3-m3
 *
 * 交付要求（详见 cards/A3-M3.md）：
 *   - recommendScore：score = 兴趣匹配×40 + 距离分×30 + 热度分×30，权重写死不许调参
 *     兴趣匹配 = tags∩interests 数量 ÷ interests 总数
 *     距离分   = 1 - distance/50（distance>50 计 0）
 *     热度分   = joined / capacity
 *   - topRecommendations(n)：返回前 n 名，确定性（同数据两次计算结果相同）
 *   - renderRecommend：今日最佳 Top3 + 附近按 distance 升序
 */
(function (root) {
  var QY = (root.QY = root.QY || {});
  var stub = QY.seam.stub;

  QY.renderRecommend = stub('M3 QY.renderRecommend', '渲染 #recommend-slot：今日最佳 Top3 + 附近列表');

  QY.recommendScore = stub('M3 QY.recommendScore', '入参 (activity, user)，返回 number 分数，权重写死 40/30/30');

  QY.topRecommendations = stub('M3 QY.topRecommendations', '入参 n:number，返回按分数倒序的前 n 条活动数组');

  if (typeof module !== 'undefined' && module.exports) { module.exports = QY; }
})(typeof window !== 'undefined' ? window : globalThis);