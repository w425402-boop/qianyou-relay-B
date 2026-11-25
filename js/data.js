/**
 * 牵友接力面试 v1.1 · 种子数据（定桩）
 *
 * 归属：M1 工程基座与数据层（A1 / B1）
 * 状态：桩 —— 本文件里 createSeedData() 目前返回空集合，需要 M1 填成真实种子数据。
 *
 * M1 交付要求（详见 cards/A1-M1.md 第 1 段）：
 *   - 活动 ≥30 条，覆盖 6 个分类：美食 / 咖啡 / 桌游 / 运动 / 文娱 / 户外
 *   - 每条活动 13 个字段齐全：id title category desc time place cost capacity
 *     joined hostId status distance tags
 *   - 用户 ≥8 个，其中 u01 是当前登录用户，nickname 固定为「我」
 *   - 时间用 ISO 字符串存，且为未来 7 天内；distance 单位 km，0–50
 *
 * 数据必须手写录入，不允许从原型整文件复制。
 */
(function (root) {
  var QY = (root.QY = root.QY || {});

  /**
   * 构造一份全新的种子数据。
   * @returns {{activities: Array, users: Array}}
   */
  QY.createSeedData = function () {
    // TODO(M1): 替换为空数组 —— 补齐 ≥30 条活动、≥8 位用户
    return {
      activities: [],
      users: []
    };
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = QY.createSeedData;
  }
})(typeof window !== 'undefined' ? window : globalThis);
