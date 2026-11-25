/**
 * 牵友接力面试 v1.1 · 定桩工具箱 (js/seam.js)
 *
 * 【本文件由出题方预置，属于冻结文件，任何棒次不得修改】
 *
 * 定桩（seam）解决接力面试的根本矛盾：
 *   上游没交付，下游不能干等 —— 否则一棒卡死，全组停摆。
 *
 * 规则：
 *   1. 桩 = 签名齐全、调用即抛 SEAM 错误的空实现。下游可以照着签名开发。
 *   2. 每棒必须把自己模块的桩换成真实现，tests/contract.js 会检查。
 *   3. 桩一旦被换成真实现，下游不得回退成桩（回退算破坏契约）。
 */
(function (root) {
  var QY = (root.QY = root.QY || {});

  /**
   * 桩工厂。返回带标记的函数，被调用时抛出可识别的 SEAM 错误。
   * @param {string} name 契约函数名，如 'M2 QY.renderDiscover'
   * @param {string} [hint] 给实现者的提示
   */
  function stub(name, hint) {
    var fn = function () {
      throw new Error(
        '[SEAM 未实现] ' + name + ' —— ' + (hint || '等待对应棒次实现')
      );
    };
    fn.__seam_stub__ = true;
    fn.__seam_name__ = name;
    return fn;
  }

  /** 判断一个函数是否还是桩 */
  function isStub(fn) {
    return !!(fn && fn.__seam_stub__ === true);
  }

  /**
   * 契约函数总清单 —— tests/contract.js 的唯一校验依据。
   * module 归属用于定位缺失函数该由哪一棒负责。
   */
  var REQUIRED_EXPORTS = [
    // M1 工程基座与数据层
    { path: 'store.load', module: 'M1', baton: 1 },
    { path: 'store.save', module: 'M1', baton: 1 },
    { path: 'store.getActivity', module: 'M1', baton: 1 },
    { path: 'store.getUser', module: 'M1', baton: 1 },
    { path: 'routes.discover', module: 'M1', baton: 1 },
    { path: 'routes.detail', module: 'M1', baton: 1 },
    { path: 'routes.publish', module: 'M1', baton: 1 },
    { path: 'routes.chat', module: 'M1', baton: 1 },
    { path: 'routes.mine', module: 'M1', baton: 1 },

    // M2 发现页
    { path: 'renderDiscover', module: 'M2', baton: 2 },
    { path: 'filterActivities', module: 'M2', baton: 2 },
    { path: 'searchActivities', module: 'M2', baton: 2 },

    // M3 推荐与附近
    { path: 'renderRecommend', module: 'M3', baton: 3 },
    { path: 'recommendScore', module: 'M3', baton: 3 },
    { path: 'topRecommendations', module: 'M3', baton: 3 },

    // M4 活动详情与报名
    { path: 'renderDetail', module: 'M4', baton: 4 },
    { path: 'signup', module: 'M4', baton: 4 },
    { path: 'cancelSignup', module: 'M4', baton: 4 },

    // M5 发布活动
    { path: 'renderPublish', module: 'M5', baton: 5 },
    { path: 'validatePublish', module: 'M5', baton: 5 },

    // M6 消息与聊天
    { path: 'renderChat', module: 'M6', baton: 6 },
    { path: 'openConversation', module: 'M6', baton: 6 },
    { path: 'sendMessage', module: 'M6', baton: 6 },

    // M7 我的与个人资料
    { path: 'renderMine', module: 'M7', baton: 7 },
    { path: 'validateProfile', module: 'M7', baton: 7 },
    { path: 'updateProfile', module: 'M7', baton: 7 },
    { path: 'toggleFavorite', module: 'M7', baton: 7 },
    { path: 'toggleFollow', module: 'M7', baton: 7 },

    // M8 管理与联调
    { path: 'renderAdmin', module: 'M8', baton: 8 },
    { path: 'toggleActivityStatus', module: 'M8', baton: 8 }
  ];

  /** 按点号路径解析 QY 上的函数，找不到返回 undefined */
  function resolve(pathStr) {
    var parts = pathStr.split('.');
    var cur = QY;
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /** 汇总当前所有契约函数的实现状态：'missing' | 'stub' | 'real' */
  function audit() {
    var rows = REQUIRED_EXPORTS.map(function (spec) {
      var fn = resolve(spec.path);
      var state;
      if (typeof fn !== 'function') state = 'missing';
      else if (isStub(fn)) state = 'stub';
      else state = 'real';
      return {
        path: spec.path,
        module: spec.module,
        baton: spec.baton,
        state: state
      };
    });
    return {
      rows: rows,
      real: rows.filter(function (r) { return r.state === 'real'; }).length,
      stub: rows.filter(function (r) { return r.state === 'stub'; }).length,
      missing: rows.filter(function (r) { return r.state === 'missing'; }).length,
      total: rows.length
    };
  }

  QY.seam = {
    version: '1.1',
    stub: stub,
    isStub: isStub,
    resolve: resolve,
    audit: audit,
    REQUIRED_EXPORTS: REQUIRED_EXPORTS
  };

  // Node 侧测试脚本可直接 require 后取用
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = QY.seam;
  }
})(typeof window !== 'undefined' ? window : globalThis);
