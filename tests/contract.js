/**
 * 牵友接力面试 v1.1 · 闸门二：契约闸门 (tests/contract.js)
 *
 * 【本文件由出题方预置，属于冻结文件，任何棒次不得修改】
 *
 * 跑法（三种等价写法，先命中的先用）：
 *   node tests/contract.js                              # 基准 origin/main，座位号从分支名推断
 *   node tests/contract.js origin/main A3               # CI 里的标准调用
 *   RELAY_SEAT=A3 node tests/contract.js origin/main    # 环境变量优先级最高
 *
 * 三类硬检查，任一条 FAIL 就 exit 1（GitHub 侧 branch protection 会挡住 Merge）：
 *   (a) 文件越界    —— 用 git diff 拿本分支全部变更，逐条对本棒白名单
 *   (b) 契约完整性  —— 30 条契约函数有没有 missing；本棒负责的模块有没有还在桩上
 *   (c) 存储与弹窗  —— 业务模块直接碰 localStorage、用 alert / confirm 阻塞弹窗
 *
 * 判定尺度：
 *   · missing（函数根本不存在）= FAIL —— 桩都没了，下游没法照签名开发
 *   · stub（还是桩）不算违规，降级接力允许留着 —— 但本棒自己那一摊还是桩就是没交付
 *   · git 环境拿不到的东西（非仓库 / 无基准提交）记 SKIP，不假装验过
 */
'use strict';

var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var helpers = require(path.join(__dirname, 'helpers.js'));

var ROOT = path.resolve(__dirname, '..');
var VIOLATIONS = [];
var SKIPS = 0;

// ---------------------------------------------------------------------------
// 输出工具
// ---------------------------------------------------------------------------

function violation(msg) {
  VIOLATIONS.push(msg);
  console.log('[FAIL] ' + msg);
}

function pass(msg) {
  console.log('[PASS] ' + msg);
}

function skip(msg, why) {
  SKIPS++;
  console.log('[SKIP] ' + msg + (why ? ' —— ' + why : ''));
}

function info(msg) {
  console.log('[INFO] ' + msg);
}

function title(text) {
  console.log('');
  console.log('='.repeat(62));
  console.log(' ' + text);
  console.log('='.repeat(62));
}

// ---------------------------------------------------------------------------
// git 与路径
// ---------------------------------------------------------------------------

function git(args) {
  return cp.execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true
  }).replace(/\r\n/g, '\n');
}

function gitOk(args) {
  try {
    return { ok: true, out: git(args).trim() };
  } catch (err) {
    return { ok: false, err: err };
  }
}

/**
 * 仓库根到本目录的相对前缀。
 * seam/ 是暂存区，真仓库里 tests/ 在根上 —— 两种布局都要能从 git 路径还原成 OWNERS.json 里的路径。
 */
var REPO_PREFIX = (function () {
  var top = gitOk(['rev-parse', '--show-toplevel']);
  if (!top.ok) return null;
  var topPath = top.out.replace(/\\/g, '/');
  var herePath = ROOT.replace(/\\/g, '/');
  if (herePath === topPath) return '';
  if (herePath.indexOf(topPath + '/') === 0) {
    return herePath.slice(topPath.length + 1).replace(/\/+$/, '');
  }
  return null; // 本目录不在 git 仓库里
})();

/** OWNERS.json 里的相对路径 -> git 眼里的路径 */
function toGitPath(relPath) {
  if (!REPO_PREFIX) return relPath;
  return REPO_PREFIX ? REPO_PREFIX + '/' + relPath : relPath;
}

/** git 返回的路径 -> OWNERS.json 里的相对路径 */
function fromGitPath(gitPath) {
  var p = String(gitPath).replace(/\\/g, '/');
  if (REPO_PREFIX && p.indexOf(REPO_PREFIX + '/') === 0) return p.slice(REPO_PREFIX.length + 1);
  if (REPO_PREFIX === '') return p;
  return p;
}

function resolveBase() {
  var wanted = process.argv[2] || 'origin/main';
  var candidates = [wanted, 'origin/main', 'main', 'HEAD~1'];
  var tried = [];
  for (var i = 0; i < candidates.length; i++) {
    var cand = String(candidates[i]).trim();
    if (!cand || tried.indexOf(cand) !== -1) continue;
    tried.push(cand);
    var r = gitOk(['rev-parse', '--verify', '--quiet', cand + '^{commit}']);
    if (r.ok) return { name: cand, requested: wanted, tried: tried };
  }
  return { name: null, requested: wanted, tried: tried };
}

/** 读基准提交里某个文件的内容，取不到返回 null */
function gitShow(base, relPath) {
  if (!base) return null;
  var r = gitOk(['show', base + ':' + toGitPath(relPath)]);
  return r.ok ? r.out : null;
}

/** 统计某文件相对基准被删 / 被改的行数 */
function countDeletedLines(base, relPath) {
  var r = gitOk(['diff', '--unified=0', base, 'HEAD', '--', toGitPath(relPath)]);
  if (!r.ok) return null;
  return r.out.split('\n').filter(function (line) {
    return line.charAt(0) === '-' && line.slice(0, 3) !== '---';
  }).length;
}

// ---------------------------------------------------------------------------
// 座位号与归属表
// ---------------------------------------------------------------------------

function readOwners() {
  var file = path.join(ROOT, 'OWNERS.json');
  if (!fs.existsSync(file)) return { ok: false, why: 'OWNERS.json 不存在' };
  try {
    return { ok: true, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (err) {
    return { ok: false, why: 'OWNERS.json 解析失败：' + String((err && err.message) || err) };
  }
}

/** 把 OWNERS.json 摊平成 { A3: {group:'A', spec:{...}} } */
function flattenBatons(owners) {
  var flat = {};
  var groups = (owners && owners.groups) || {};
  Object.keys(groups).forEach(function (g) {
    var batons = groups[g].batons || {};
    Object.keys(batons).forEach(function (seat) {
      flat[String(seat).toUpperCase()] = { group: g, spec: batons[seat] };
    });
  });
  return flat;
}

/** 当前分支名 -> 座位号（seat/a3-m3 -> A3，resc/b8-m8 -> B8） */
function seatFromBranch() {
  var r = gitOk(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!r.ok) return null;
  var m = /^(?:seat|resc)\/([a-zA-Z])(\d+)/.exec(r.out);
  if (!m) return null;
  return (m[1] + m[2]).toUpperCase();
}

function resolveSeat() {
  var fromEnv = process.env.RELAY_SEAT ? String(process.env.RELAY_SEAT).trim().toUpperCase() : '';
  if (fromEnv) return { seat: fromEnv, how: '环境变量 RELAY_SEAT' };

  var fromArg = process.argv[3] ? String(process.argv[3]).trim().toUpperCase() : '';
  if (fromArg) return { seat: fromArg, how: '命令行参数 argv[3]' };

  var fromBranch = seatFromBranch();
  if (fromBranch) return { seat: fromBranch, how: '分支名推断' };

  return { seat: null, how: '未知（RELAY_SEAT / argv[3] / 分支名都没命中）' };
}

/** 找出这个文件归哪一棒 */
function ownerOf(owners, relPath) {
  var flat = flattenBatons(owners);
  var seats = Object.keys(flat);
  for (var i = 0; i < seats.length; i++) {
    var spec = flat[seats[i]].spec || {};
    if ((spec.owns || []).indexOf(relPath) !== -1) {
      return { seat: seats[i], module: spec.module || '?', moduleName: spec.moduleName || '' };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 启动
// ---------------------------------------------------------------------------

console.log('='.repeat(62));
console.log(' 牵友 · 契约闸门（文件越界 / 契约完整性 / 存储与弹窗）');
console.log('='.repeat(62));

var ownersRes = readOwners();
if (!ownersRes.ok) {
  violation('归属表不可用：' + ownersRes.why + ' —— 冻结文件，须从出题方种子仓库恢复');
}
var owners = ownersRes.ok ? ownersRes.data : { frozen: [], globalAppendOnly: [], groups: {} };

var baseRes = resolveBase();
var seatRes = resolveSeat();

info('仓库相对前缀：' + (REPO_PREFIX === null ? '（本目录不在 git 仓库内）' : (REPO_PREFIX === '' ? '（tests/ 就在仓库根目录）' : '「' + REPO_PREFIX + '/」')));
info('基准提交：' + (baseRes.name ? baseRes.name + '（请求的是 ' + baseRes.requested + '）' : '解析失败，试过：' + baseRes.tried.join(', ')));
info('本棒座位号：' + (seatRes.seat || '未识别') + '（来源：' + seatRes.how + '）');

var flatBatons = flattenBatons(owners);
var seatSpec = seatRes.seat && flatBatons[seatRes.seat] ? flatBatons[seatRes.seat].spec : null;
var seatModules = seatSpec && seatSpec.module
  ? String(seatSpec.module).split('+').map(function (s) { return s.trim(); }).filter(Boolean)
  : [];

if (seatRes.seat && !seatSpec) {
  violation('座位号 ' + seatRes.seat + ' 在 OWNERS.json 里不存在 —— 检查分支名或 RELAY_SEAT 是否拼错');
} else if (seatSpec) {
  info('本棒职责：' + seatSpec.module + ' ' + (seatSpec.moduleName || ''));
}

// ---------------------------------------------------------------------------
// (a) 文件越界检查
// ---------------------------------------------------------------------------

title('(a) 文件越界检查');

var changed = [];
var changedKnown = false;

if (!REPO_PREFIX && REPO_PREFIX !== '') {
  skip('相对基准的变更文件清单', '本目录不在 git 仓库内，拿不到 diff');
} else if (!baseRes.name) {
  skip('相对基准的变更文件清单', '基准提交解析失败');
} else {
  var diffRes = gitOk(['diff', '--name-only', '--diff-filter=ACMR', baseRes.name, 'HEAD']);
  if (!diffRes.ok) {
    skip('相对基准的变更文件清单', 'git diff 执行失败：' + String((diffRes.err && diffRes.err.message) || diffRes.err).split('\n')[0]);
  } else {
    changedKnown = true;
    changed = diffRes.out.split('\n')
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
      .map(fromGitPath);

    var untracked = gitOk(['ls-files', '--others', '--exclude-standard']);
    var untrackedList = untracked.ok
      ? untracked.out.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).map(fromGitPath)
      : [];

    if (changed.length === 0) {
      info('本分支相对 ' + baseRes.name + ' 没有任何已提交的文件变更（越界检查无事可做）');
      if (untrackedList.length) {
        info('注意：还有 ' + untrackedList.length + ' 个未跟踪文件没进 commit，本次不计入越界判定 —— 提交后要重新跑一遍');
      }
    } else {
      info('本分支相对 ' + baseRes.name + ' 变更 ' + changed.length + ' 个文件：' + changed.join(', '));
    }
  }
}

if (changedKnown) {
  var frozen = (owners.frozen || []).slice();
  var globalAppendOnly = (owners.globalAppendOnly || []).slice();
  var seatOwns = seatSpec ? (seatSpec.owns || []).slice() : [];
  var seatAppendOnly = seatSpec ? (seatSpec.appendOnly || []).slice() : [];
  var whitelist = seatOwns.concat(seatAppendOnly);

  // 交付物：本棒自己的交接文档，任何棒都该能提交 handovers/<座位>-handover.md
  var handoverName = seatRes.seat ? ('handovers/' + seatRes.seat + '-handover.md') : null;

  if (!seatSpec && changed.length > 0) {
    violation('无法确定本棒座位号，但有 ' + changed.length + ' 个变更文件 —— 没法判定越界（CI 里请确认 RELAY_SEAT 或分支名）');
  }

  if (seatSpec && changed.length > 0) {
    var outOfScope = 0;
    var touchedFrozen = 0;
    var appendOnlyDeletions = 0;

    changed.forEach(function (file) {
      // 1) 冻结文件 —— 单独一条更重的 FAIL
      if (frozen.indexOf(file) !== -1) {
        touchedFrozen++;
        violation('触碰冻结文件：' + file + ' —— 出题方预置，任何棒次都不得修改（改契约须走 PR 并经面试官审批）');
        return;
      }

      // 2) 白名单
      var isHandover = handoverName && file.toLowerCase() === handoverName.toLowerCase();
      var mode = null;
      if (seatOwns.indexOf(file) !== -1) mode = 'owns';
      else if (seatAppendOnly.indexOf(file) !== -1 || globalAppendOnly.indexOf(file) !== -1) mode = 'appendOnly';
      else if (isHandover) mode = 'handover';

      if (!mode) {
        outOfScope++;
        var owner = ownerOf(owners, file);
        if (owner) {
          violation('越界修改：' + file + ' —— 属于 ' + owner.seat + '（' + owner.module + ' ' + owner.moduleName + '），本棒 ' + seatRes.seat + ' 无权修改');
        } else {
          violation('越界修改：' + file + ' —— 不属于任何棒次的写域，也不在 ' + seatRes.seat + ' 的白名单里');
        }
        return;
      }

      info('允许：' + file + '（' + mode + '）');
    });

    // 3) appendOnly 只许追加不许删
    var appendOnlyChanged = changed.filter(function (file) {
      return seatAppendOnly.indexOf(file) !== -1 || globalAppendOnly.indexOf(file) !== -1;
    });

    appendOnlyChanged.forEach(function (file) {
      var deleted = countDeletedLines(baseRes.name, file);
      if (deleted === null) {
        skip('appendOnly 纯追加检查：' + file, 'git diff 读不出来');
        return;
      }
      if (deleted > 0) {
        appendOnlyDeletions++;
        violation('appendOnly 文件只许追加，检出了删除：' + file + '（' + deleted + ' 行以 - 开头，说明改动或删掉了别人写的内容）');
      } else {
        pass('appendOnly 文件纯追加，未动他人内容：' + file);
      }
    });

    if (outOfScope === 0 && touchedFrozen === 0 && appendOnlyDeletions === 0) {
      pass('文件越界检查：' + changed.length + ' 个变更文件全部落在本棒 ' + seatRes.seat + ' 的白名单内');
    }
  } else if (seatSpec && changed.length === 0) {
    pass('文件越界检查：本分支没有文件变更，无越界可言');
  }
} else {
  skip('文件越界逐条判定', '变更清单拿不到');
}

// ---------------------------------------------------------------------------
// (b) 契约函数完整性检查
// ---------------------------------------------------------------------------

title('(b) 契约函数完整性检查');

var QY = helpers.loadApp(ROOT);
var loadReport = helpers.loadState();

info('已加载：' + (loadReport.loaded.join(', ') || '（无）'));
if (loadReport.missing.length) {
  info('未找到：' + loadReport.missing.join(', '));
}
loadReport.failed.forEach(function (f) {
  violation('模块加载抛错：' + f.file + ' —— ' + String((f.error && f.error.message) || f.error).split('\n')[0]);
});

if (!QY || !QY.seam || typeof QY.seam.audit !== 'function') {
  violation('js/seam.js 未加载或未导出 QY.seam.audit —— 契约审计无法进行（冻结文件，须从种子仓库恢复）');
} else {
  var audit = QY.seam.audit();
  info('契约函数共 ' + audit.total + ' 条：real ' + audit.real + ' · stub ' + audit.stub + ' · missing ' + audit.missing);

  var missingRows = audit.rows.filter(function (r) { return r.state === 'missing'; });
  var stubRows = audit.rows.filter(function (r) { return r.state === 'stub'; });
  var realRows = audit.rows.filter(function (r) { return r.state === 'real'; });

  if (missingRows.length === 0) {
    pass('契约函数一个不缺：' + audit.total + '/' + audit.total + ' 都在（real ' + realRows.length + ' + stub ' + stubRows.length + '）');
  }
  missingRows.forEach(function (r) {
    violation('契约函数缺失：QY.' + r.path + '，应由 ' + r.module + ' 提供');
  });

  // 本棒负责的模块不许还留桩
  var myStubRows = stubRows.filter(function (r) { return seatModules.indexOf(r.module) !== -1; });
  var otherStubRows = stubRows.filter(function (r) { return seatModules.indexOf(r.module) === -1; });

  if (seatModules.length === 0) {
    info('座位号未识别，跳过「本棒模块不许留桩」判定；仍有 ' + stubRows.length + ' 条契约函数是桩');
  } else if (myStubRows.length === 0) {
    pass('本棒 ' + seatRes.seat + ' 负责的 ' + seatModules.join('+') + ' 已全部落地，没有留桩');
  }
  myStubRows.forEach(function (r) {
    violation('本棒 ' + seatRes.seat + ' 负责 ' + r.module + '，但 QY.' + r.path + ' 仍是桩，未交付');
  });

  if (otherStubRows.length) {
    var compact = compactByModule(otherStubRows);
    info('非本棒模块仍是桩（降级接力允许，不计违规）：' + compact.summary);
    info('  明细（前 8 条，共 ' + otherStubRows.length + ' 条）：' +
      otherStubRows.slice(0, 8).map(function (r) { return r.module + ' QY.' + r.path; }).join(', ') +
      (otherStubRows.length > 8 ? ' …' : ''));
  }

  // 回退成桩：基准里已经是真实现，本棒却换回了桩 —— 契约第 3 条明令禁止
  if (!baseRes.name) {
    skip('回退成桩检查', '基准提交解析失败');
  } else if (seatModules.length === 0) {
    skip('回退成桩检查', '座位号未识别，无法把回退归因到本棒');
  } else {
    var regressions = [];
    var checkedFiles = 0;

    stubRows.concat(missingRows).forEach(function (row) {
      if (seatModules.indexOf(row.module) === -1) return;
      var files = helpers.MODULE_FILES[row.module] || [];
      files.forEach(function (file) {
        var oldText = gitShow(baseRes.name, file);
        if (oldText === null) return;
        checkedFiles++;
        if (definesRealImplementation(oldText, row.path)) {
          regressions.push({ row: row, file: file });
        }
      });
    });

    regressions.forEach(function (reg) {
      violation('回退成桩：' + reg.file + ' 在 ' + baseRes.name + ' 里已实现 QY.' + reg.row.path +
        '，本分支却退回桩 / 缺失 —— 契约第 3 条禁止下游把真实现改回桩');
    });
    if (checkedFiles > 0 && regressions.length === 0) {
      pass('回退成桩检查：本棒模块没有把 ' + baseRes.name + ' 的真实现改回桩');
    }
  }
}

/** 基准版本里这个函数是真实现还是桩？ */
function definesRealImplementation(text, funcPath) {
  var code = helpers.stripComments(text);
  var symbol = String(funcPath);
  var prefix = symbol.indexOf('.') === -1 ? '(?:^|[^\\w$])' : '(?:^|[^\\w$.])';
  var re = new RegExp(prefix + escapeRe(symbol) + '\\s*=', 'g');
  var m;
  while ((m = re.exec(code)) !== null) {
    var tail = code.slice(m.index, m.index + 300);
    // 种子仓库的桩有两种写法：QY.seam.stub(...) 与 var stub = QY.seam.stub; 之后 stub(...)
    if (tail.indexOf('seam.stub') !== -1) continue;
    if (/\bstub\s*\(/.test(tail)) continue;
    return true;
  }
  return false;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 把一批契约函数按模块压缩成 M1×9 M2×3 这样的一行 */
function compactByModule(rows) {
  var order = [];
  var map = {};
  rows.forEach(function (r) {
    if (!map[r.module]) {
      map[r.module] = 0;
      order.push(r.module);
    }
    map[r.module]++;
  });
  return {
    summary: order.map(function (m) { return m + '×' + map[m]; }).join(' ')
  };
}

// ---------------------------------------------------------------------------
// (c) localStorage 泄漏与阻塞弹窗检查
// ---------------------------------------------------------------------------

title('(c) localStorage 泄漏与阻塞弹窗检查');

var STORAGE_OWNER = 'js/store.js'; // 全项目唯一允许碰 localStorage 的文件
var EXCLUDED = [STORAGE_OWNER, 'js/seam.js'];

var jsFiles = helpers.listJsFiles(ROOT);
info('扫描 js/ 下 ' + jsFiles.length + ' 个文件，豁免：' + EXCLUDED.join(', ') + '（契约第 2.3 条的例外，注释内容不计）');

var storageLeaks = 0;
var popupLeaks = 0;
var scanned = 0;

jsFiles.forEach(function (rel) {
  if (EXCLUDED.indexOf(rel) !== -1) return;
  scanned++;

  var raw;
  try {
    raw = fs.readFileSync(path.join(ROOT, rel.split('/').join(path.sep)), 'utf8');
  } catch (err) {
    skip('扫描 ' + rel, '读不出来');
    return;
  }

  // 注释先抹掉，避免「// 不要直接调 localStorage」这种话被误判成违规代码
  var code = helpers.stripComments(raw);

  var hitsStorage = [];
  var storageRe = /localStorage/g;
  var m;
  while ((m = storageRe.exec(code)) !== null) {
    hitsStorage.push(helpers.lineAt(code, m.index));
  }
  if (hitsStorage.length) {
    storageLeaks++;
    violation(rel + ' 直接访问 localStorage（第 ' + hitsStorage.join('、') + ' 行），违反契约第 2.3 条 —— 必须走 QY.store.load / save / getActivity / getUser');
  }

  var hitsPopup = [];
  ['alert', 'confirm'].forEach(function (fn) {
    var re = new RegExp('\\b' + fn + '\\s*\\(', 'g');
    while ((m = re.exec(code)) !== null) {
      hitsPopup.push(fn + '() 第 ' + helpers.lineAt(code, m.index) + ' 行');
    }
  });
  if (hitsPopup.length) {
    popupLeaks++;
    violation(rel + ' 使用了阻塞式弹窗（' + hitsPopup.join('、') + '），违反契约第 5 条硬性编码约定 —— 改用 QY.toast 或页面内提示');
  }
});

// 装载过程中真的弹过窗？静态扫描之外再补一枪
var runtimePopups = helpers.runtimePopupCalls();
if (runtimePopups.alert.length || runtimePopups.confirm.length) {
  violation('模块装载期间实际调用了阻塞弹窗：alert ' + runtimePopups.alert.length + ' 次 / confirm ' +
    runtimePopups.confirm.length + ' 次 —— 样例：' + (runtimePopups.alert.concat(runtimePopups.confirm).slice(0, 2).join(' | ')));
}

if (storageLeaks === 0) {
  pass('除 ' + EXCLUDED.join(' 与 ') + ' 外，' + scanned + ' 个 js 文件均未直接访问 localStorage');
}
if (popupLeaks === 0) {
  pass('未发现 alert / confirm 阻塞弹窗');
}

// ---------------------------------------------------------------------------
// 判定
// ---------------------------------------------------------------------------

console.log('');
console.log('='.repeat(62));

if (VIOLATIONS.length === 0) {
  console.log(' 契约闸门：PASS');
  if (SKIPS > 0) {
    console.log(' （其中有 ' + SKIPS + ' 项因环境拿不到数据而 SKIP，见上面的 [SKIP] 行）');
  }
  console.log('='.repeat(62));
  process.exitCode = 0;
} else {
  console.log(' 契约闸门：FAIL（' + VIOLATIONS.length + ' 项违规）');
  console.log('='.repeat(62));
  console.log('');
  console.log(' 逐条违规：');
  VIOLATIONS.forEach(function (v, i) {
    console.log('  ' + (i + 1) + '. ' + v);
  });
  process.exitCode = 1;
}

process.exit(process.exitCode || 0);
