# 牵友（QianYou）接力开发交接契约 CONTRACT.md

> **版本号**：v1.1（定桩版）
> **状态**：**冻结** —— 冻结后任何棒次不得单方面修改。
> 确需变更必须提 PR 说明原因，经面试官审批同意后方可合并；私自改动本文件按契约违规处理，该棒模块记 0 分。

---

## 0. 本版新增：定桩（seam）

接力面试的根本矛盾是**上游没交付、下游不能干等**。一棒卡死，全组停摆。

定桩解决这个问题：出题方在 `main` 上预置**一整套签名齐全、调用即报错的空实现**。

```js
// js/modules/discover.js（开机状态）
QY.renderDiscover = QY.seam.stub('M2 QY.renderDiscover');
```

调用它只会得到一句话：

```
[SEAM 未实现] M2 QY.renderDiscover —— 等待对应棒次实现
```

于是：

| 角色 | 定桩带来的结果 |
| :--- | :--- |
| 下游棒次 | 接口在、签名在、DOM 挂载点在，可以照常开发和自测，**不等上游** |
| 上游棒次 | 必须把自己模块的桩换成真实现才能通过契约闸门，**躲不掉** |
| 面试官 | 打开页面点「桩状态」，30 个函数的实现进度一目了然 |

**一句话：桩让下游随时能开工，闸门让上游必须交付。**

三条铁律：

1. 桩函数在 `js/seam.js` 的 `REQUIRED_EXPORTS` 中登记，共 **30 条**，缺一条就是契约违规。
2. 本棒开工时自己模块是桩，交付时**必须不再是桩**（`tests/contract.js` 检查）。
3. 已经被换成真实实现的函数，**任何棒次不得回退成桩**（回退等于让下游重新断供）。

---

## 1. 数据模型（字段名、类型固定）

### 1.1 Activity（活动）
```js
{
  id: 'a01',                         // string: 唯一标识（种子 a01~a32，新发布为 'a' + 时间戳）
  title: '周五下班云南铜锅菌子局',      // string: 活动标题（2–20 字）
  category: '美食',                   // string: '美食' | '咖啡' | '桌游' | '运动' | '文娱' | '户外'
  desc: '活动详细介绍...',              // string: 活动描述（≤200 字）
  time: '2026-11-26T11:00:00.000Z',  // string: ISO 时间字符串（展示为「11月29日 19:00」）
  place: '静安寺愚园路云山小馆',        // string: 活动地点
  cost: 88,                          // number: 人均费用（元，0 表示免费）
  capacity: 8,                       // number: 人数上限（整数 2–50）
  joined: 5,                         // number: 已报名人数（0 <= joined <= capacity）
  signedUserIds: ['u04', 'u02'],     // string[]: 已报名用户 id 数组
  hostId: 'u04',                     // string: 发起人用户 id
  status: 'ongoing',                 // string: 'ongoing' 进行中 | 'ended' 已结束
  distance: 2.0,                     // number: 距离公里数（0–50，单位 km）
  tags: ['美食', '晚餐']              // string[]: 活动标签数组（至少 1 个）
}
```

### 1.2 User（用户）
```js
{
  id: 'u01',                         // string: 用户唯一 id（当前登录用户固定为 'u01'）
  nickname: '我',                     // string: 昵称（u01 初始固定为「我」）
  avatar: 'data:image/svg+xml...',   // string: 离线可用 SVG Data URI 头像
  gender: '男',                       // string: 性别
  age: 26,                           // number: 年龄（18–80）
  city: '上海',                      // string: '北京'|'上海'|'广州'|'深圳'|'成都'|'杭州'
  mbti: 'ENFP',                      // string: 16 型 MBTI 之一
  occupation: '产品设计师',            // string: 职业
  interests: ['咖啡', '桌游', '徒步', '看展'], // string[]: 兴趣数组（至少 1 个）
  tags: ['周末组局达人', '守时靠谱'],   // string[]: 标签数组
  bio: '个人简介...'                   // string: 个人简介
}
```

### 1.3 Message（消息）
```js
{ id: 'm01', convId: 'grp_a01', fromId: 'u02', text: '周五不见不散！', time: '2026-11-25T10:30:00.000Z' }
```

### 1.4 Comment（评论）
```js
{ id: 'cm01', activityId: 'a01', userId: 'u02', text: '新手友好吗？已报名！', time: '2026-11-25T10:15:00.000Z' }
```

### 1.5 Conversation（会话）
```js
{
  id: 'grp_a01',                     // 群聊 grp_<actId>，私信 dm_<userId>
  type: 'group',                     // 'group' | 'dm'
  title: '周五下班云南铜锅菌子局',
  activityId: 'a01',                 // 可选
  targetUserId: 'u04',               // 可选
  members: ['u01', 'u04'],
  lastMsg: '周五不见不散！',
  lastTime: '2026-11-25T10:30:00.000Z',
  unread: 1                          // 打开后清零
}
```

---

## 2. 存储与路由规范

1. **存储键名**：固定为 `qianyou-interview-v1`。
2. **顶层结构**：
   `{ version: 1, activities: [], users: [], messages: [], comments: [], conversations: [], favorites: [], follows: [], draft: null }`
3. **唯一读写入口**：全项目只允许通过 `js/store.js` 的 `QY.store.load()` / `save()` / `getActivity(id)` / `getUser(id)` 读写数据。**除 `js/store.js` 外，任何文件出现 `localStorage` 字样即违规**，由 `tests/contract.js` 自动拦截。
4. **Hash 路由**：
   - `#/discover`：发现页（含 `#recommend-slot` 推荐区与 `#activity-list` 列表区）
   - `#/detail/:id`：活动详情与报名页
   - `#/publish`：发布活动页
   - `#/chat`（及 `#/chat?conv=:id`）：消息与聊天页
   - `#/mine`：我的与个人资料页
   - `#/admin`：管理面板（顶部栏入口，不占底部 4 项 Tab）
5. **底部固定 4 项 Tab**：`发现` / `发布` / `消息` / `我的`，DOM id 依次为 `tab-discover` / `tab-publish` / `tab-chat` / `tab-mine`。
6. **渲染挂载点**：全项目唯一，`#app`。跨模块约定的 DOM 锚点：`#activity-list`、`#recommend-slot`、`#publish-form`、`#conv-list`、`#chat-window`、`#profile-card`、`#profile-card`、`#admin-list`。

---

## 3. 目录与模块边界

```text
/index.html                    应用外壳 + 顶部栏 + 底部 4 Tab（M1）
/css/style.css                 全局样式（M1 建，后续只追加不改已有）
/js/seam.js                    定桩工具箱 + 30 条契约清单【冻结】
/js/boot.js                    启动引导 + 桩状态面板【冻结】
/js/store.js                   本地存储层（M1）
/js/data.js                    种子数据（M1：≥30 条活动、≥8 位用户）
/js/router.js                  Hash 路由与通用工具（M1）
/js/modules/discover.js        发现页（M2）
/js/modules/recommend.js       推荐 40/30/30、今日最佳 Top3、附近（M3）
/js/modules/detail.js          详情、报名/取消、参与者、评论（M4）
/js/modules/publish.js         发布表单、7 项校验、30s 草稿（M5）
/js/modules/chat.js            群聊/私信、会话列表、未读清零（M6）
/js/modules/mine.js            10 项资料、编辑校验、收藏关注、动态（M7）
/js/modules/admin.js           管理面板状态切换（M8）
/js/modules/integration.js     全链路主流程 6 步联调（A7 / B8）
/tests/check.js                闸门一：功能断言【跨棒累积，只许追加】
/tests/contract.js             闸门二：契约校验【冻结】
/tests/helpers.js              Node 侧垫片（mock DOM/localStorage）【冻结】
/handovers/<座位>-handover.md  各棒交接单（每棒自己那份）
/cards/<座位>-<模块>.md        个人题目卡（只发给自己）
/CONTRACT.md                   本文件【冻结】
/TEAMS.md                      15 人分工表【冻结】
/OWNERS.json                   文件归属表，contract.js 的数据源【冻结】
```

---

## 4. 模块对外契约函数（挂载于 `window.QY`）

共 **30 条**，与 `js/seam.js` 的 `REQUIRED_EXPORTS` 一一对应。缺任何一条 → 契约闸门 FAIL。

| 模块 | 对外函数 | 说明 |
| :--- | :--- | :--- |
| M1 | `store.load` / `store.save` / `store.getActivity` / `store.getUser` | 存储读写（另附 `store.reset` 供测试） |
| M1 | `routes.discover` / `routes.detail` / `routes.publish` / `routes.chat` / `routes.mine` | 5 大路由处理函数 |
| M2 | `renderDiscover()` / `filterActivities(list, cond)` / `searchActivities(list, kw)` | 发现列表渲染 + 两个纯函数 |
| M3 | `renderRecommend()` / `recommendScore(act, user)` / `topRecommendations(n)` | 推荐打分（40/30/30）与前 N |
| M4 | `renderDetail(id)` / `signup(id)` / `cancelSignup(id)` | 详情渲染、报名与取消 |
| M5 | `renderPublish()` / `validatePublish(fields)` | 发布页渲染与校验 |
| M6 | `renderChat(params)` / `openConversation(convId)` / `sendMessage(convId, text)` | 聊天、清未读、发消息 |
| M7 | `renderMine()` / `validateProfile(patch)` / `updateProfile(patch)` / `toggleFavorite(id)` / `toggleFollow(uid)` | 资料编辑校验与收藏关注 |
| M8 | `renderAdmin()` / `toggleActivityStatus(id, nextStatus)` | 管理面板与状态切换 |

**签名约定**：入参与返回类型以本表为准。函数内部实现自由，但**名字、参数顺序、返回语义不许改**——下游和 `tests/check.js` 都按这个签名调用。

---

## 5. 硬性编码约定

- 纯 HTML / CSS / JS，**无框架、无构建步骤、无第三方依赖**，断网可直接运行。
- 变量与函数名英文，注释中文；文件编码 `UTF-8`（无 BOM），换行统一 `LF`。
- **严禁 `alert` / `confirm` 等阻塞弹窗**，所有交互反馈走 `QY.toast(msg)` 或页面内组件。
- 不许删改别人 `owns` 的文件；发现上游 bug 只记录到交接单，不私自修复（私自修复按违规扣分）。
- 不许直推 `main`；不许 `force push`；不许改 `CONTRACT.md` / `OWNERS.json` / `js/seam.js` / `js/boot.js` / `tests/contract.js`（冻结文件）。
- 不许把整个原型文件复制进来当「基座」，种子数据必须手写录入。

---

## 6. 分支与提交约定

### 6.1 分支命名
```
seat/<组><棒次>-<模块>      # 每人工作分支，如 seat/a3-m3、seat/b8-m8
resc/<组><棒次>-<模块>      # 救援分支，仅在上游未交付且需顶替时由面试官开出
main                        # 冻结真值线，只接受 PR
```

### 6.2 每人固定 4 步
```bash
git pull origin main                       # 接手：拉最新真值
git checkout -b seat/a<N>-m<N>             # 开自己的分支
# …开发，每 15 分钟一次 commit（共三次：T+15m / T+30m / T+45m）…
git push -u origin seat/a<N>-m<N>          # 推送
gh pr create --base main                   # 提 PR，等双闸门绿 + 上一棒 review
```

### 6.3 commit 信息格式（评分依据，乱写扣分）
```
feat(m<N>): [15m] <本 15 分钟完成了什么>
feat(m<N>): [30m] <本 30 分钟完成了什么>
test(m<N>): [45m] <追加了哪些断言 / 联调了什么>
docs(<座位>): 提交本棒《交接单》
```

### 6.4 合并条件（四条全绿才允许 Merge）
1. `gate` CI 通过（= 闸门一 + 闸门二全绿）
2. 上一棒在 PR 上 review 并 approve
3. `handovers/<座位>-handover.md` 已提交且六段填完
4. 本棒模块在 `QY.seam.audit()` 里状态为 `real`，不再是 `stub`

---

## 7. 常见违规对照表（评审与扣分依据）

| 违规 | 如何被检出 | 扣分 |
| :--- | :--- | :--- |
| 改了别人 `owns` 的文件 | `tests/contract.js` 文件越界检查 | −3 分/条 |
| `appendOnly` 文件里删了行 | `tests/contract.js` 删除行检查 | −3 分/条 |
| 契约函数缺失 | `tests/contract.js` 完整性检查 | −3 分/条 |
| 本棒模块交付时仍是桩 | `tests/contract.js` 桩检查 | 该模块记 0 |
| 直接访问 `localStorage` | `tests/contract.js` 泄漏扫描 | −3 分/条 |
| 用 `alert` / `confirm` | `tests/contract.js` 泄漏扫描 | −3 分/条 |
| 改冻结文件 | 文件越界检查的加重项 | 该模块记 0 |
| 直推 `main` | 分支保护直接拒绝 | 操作失败，计时不停 |
| 回退下游已实现的函数成桩 | 上一棒 review + `audit` 对比 | −10 分 |
| 交接单没写 / 六段不全 | 合并条件第 3 条 | 交接质量记 0 |
