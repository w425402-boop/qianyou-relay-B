<!--
  牵友接力面试 v1.1 · PR 模板
  【落地位置】真仓库里本文件必须位于 /.github/PULL_REQUEST_TEMPLATE.md
  建 PR 时 GitHub 会自动把下面的内容填进描述框，照着填完再点 Create。
  填完这一页，就是给下一棒的交接书 —— 下游不看你的聊天记录，只看这个。
-->

## 一、本棒信息

| 项 | 填写 |
| :--- | :--- |
| 座位号 | <!-- 例：A3 / B8 --> |
| 负责模块 | <!-- 例：M3 推荐与附近；A7 写 M7+M8 --> |
| 分支名 | <!-- 例：seat/a3-m3 --> |
| 基准分支 | `main` |
| 本棒交付的契约函数 | <!-- 例：QY.renderRecommend、QY.recommendScore、QY.topRecommendations --> |

---

## 二、五问五答

### 1. 我改了哪些文件？

<!-- 逐条列出，一条一个文件。只该出现 OWNERS.json 允许你改的那几行。
     拿不准就跑：node tests/contract.js origin/main <你的座位号> -->

- `js/modules/xxx.js` ——
- `css/style.css` —— 只在末尾追加了 …
- `tests/check.js` —— 只在末尾追加了 M?-1 … M?-n 断言

### 2. 我把自己模块的桩换掉了吗？

<!-- 全部换掉了 / 换掉了 N 个，还剩哪个没换（为什么）。
     契约闸门会挨个点名：QY.xxx 仍是桩，未交付 -->

- [ ] 本棒负责的契约函数已全部从 `QY.seam.stub(...)` 换成真实现
- 仍留桩的（如有）：

### 3. 遗留 TODO

<!-- 我知道没做完的地方，一行一条。这栏写空是最危险的一种诚实 ——
     下游会以为你全做完了，然后把时间花在猜你的心思上。 -->

- [ ] 无
- [ ]

### 4. 下游必须知道什么？

<!-- 下一棒会踩到的坑：接口的隐藏约定、我改了哪条既有行为、
     哪个边界没处理、依赖的上游函数还是桩时该怎么降级。
     这是整份 PR 里最值钱的一栏。 -->

-

### 5. 闸门是否全绿？

| 闸门 | 命令 | 结果 |
| :--- | :--- | :--- |
| 契约闸门 | `node tests/contract.js origin/main <座位号>` | <!-- PASS / FAIL --> |
| 功能闸门 | `node tests/check.js` | <!-- PASS / FAIL（SKIP 不算失败） --> |

CI 跑完会自动把结果表贴到本 PR 评论区；本地跑过再提，别把红脸交给老师看。

---

## 三、提交前自查清单

- [ ] ☐ `node tests/check.js` 全绿（`[SKIP]` 是桩未实现，不算失败）
- [ ] ☐ `node tests/contract.js` 全绿（0 项违规）
- [ ] ☐ `handovers/<座位>-handover.md` 已提交（例：`handovers/A3-handover.md`）
- [ ] ☐ 只改了自己 `owns` 的文件，`appendOnly` 文件（`css/style.css`、`tests/check.js`）只在末尾追加
- [ ] ☐ 没有碰冻结文件：`CONTRACT.md`、`TEAMS.md`、`OWNERS.json`、`js/seam.js`、`tests/contract.js`、`tests/helpers.js`
- [ ] ☐ 业务模块里没有直接调 `localStorage`（一律走 `QY.store`），没有 `alert` / `confirm`
- [ ] ☐ 文件 UTF-8 无 BOM、换行 LF、注释中文、标识符英文
- [ ] ☐ 没有把上游已交付的真实现改回桩
- [ ] ☐ 分支是从最新 `main` 拉的，冲突已在本地解决并重跑过两道闸门

---

<!-- 备注：这一页不是走形式。A1→A7 / B1→B8 是接力，不是八个独立题；
     你少写一句「下游必须知道」，下一棒就要用 50 分钟里的 10 分钟去猜。 -->
