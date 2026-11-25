/**
 * 牵友接力面试 v1.1 · 统一存储层（定桩）
 *
 * 归属：M1 工程基座与数据层（A1 / B1）
 * 状态：桩 —— 四个读函数与 load/save 全部是 QY.seam.stub。
 *
 * 契约（CONTRACT.md 第 2 条）：
 *   - 存储键固定为 qianyou-interview-v1
 *   - 顶层结构 { version:1, activities, users, messages, comments,
 *               conversations, favorites, follows, draft }
 *   - 全项目只有本文件能碰 localStorage，其余模块一律走 QY.store
 *
 * M1 交付要求：把下面每个 stub 换成真实实现，并保证
 *   node tests/check.js 的 M1 段全 PASS、tests/contract.js 报「本棒模块不再是桩」。
 */
(function (root) {
  var QY = (root.QY = root.QY || {});
  var stub = QY.seam.stub;

  /** 存储键，契约冻结值，不许改 */
  var STORAGE_KEY = 'qianyou-interview-v1';

  var store = {
    KEY: STORAGE_KEY,

    // TODO(M1): 读出完整状态。首次无数据时写入 createSeedData() 的种子数据。
    load: stub('M1 QY.store.load', '读 localStorage[qianyou-interview-v1]，无数据则用 createSeedData() 初始化并写回'),

    // TODO(M1): 写入完整状态，缺字段要补默认值，返回写入后的对象。
    save: stub('M1 QY.store.save', '写 localStorage[qianyou-interview-v1]，返回规范化后的状态'),

    // TODO(M1): 按 id 查单条活动，查不到返回 null。
    getActivity: stub('M1 QY.store.getActivity', '入参 id:string，命中返回活动对象，未命中返回 null'),

    // TODO(M1): 按 id 查单个用户，查不到返回 null。
    getUser: stub('M1 QY.store.getUser', '入参 id:string，命中返回用户对象，未命中返回 null'),

    // TODO(M1): 清空并重新初始化，供测试脚本用。
    reset: stub('M1 QY.store.reset', '清空存储键后重新 load，返回新状态；tests/check.js 依赖它')
  };

  QY.store = store;
  root.store = store;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = store;
  }
})(typeof window !== 'undefined' ? window : globalThis);
