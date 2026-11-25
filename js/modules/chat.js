/**
 * 牵友接力面试 v1.1 · M6 消息与聊天（定桩）
 *
 * 归属：M6（A6 / B6）  分支：seat/a6-m6、seat/b6-m6
 *
 * 交付要求（详见 cards/A6-M6.md）：
 *   - renderChat(params)：会话列表（群聊/私信）+ 聊天气泡窗口
 *   - openConversation(convId)：打开会话，未读清零并持久化
 *   - sendMessage(convId, text)：空消息不提交；发送后持久化并即时上屏
 *   - 用事件代理把 M4 详情页的「联系发起人」「进群聊」接到本模块，不许改 detail.js
 */
(function (root) {
  var QY = (root.QY = root.QY || {});
  var stub = QY.seam.stub;

  QY.renderChat = stub('M6 QY.renderChat', '渲染 #conv-list 会话列表 + #chat-window 聊天窗口');

  QY.openConversation = stub('M6 QY.openConversation', '入参 convId:string，打开会话并把 unread 清零持久化');

  QY.sendMessage = stub('M6 QY.sendMessage', '入参 (convId:string, text:string)，空文本返回 false，成功返回 true');

  if (typeof module !== 'undefined' && module.exports) { module.exports = QY; }
})(typeof window !== 'undefined' ? window : globalThis);