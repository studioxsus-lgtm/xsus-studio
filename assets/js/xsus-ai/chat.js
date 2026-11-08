
/**
 * XSUS AI V3 — Chat Controller
 * Version: 3.2.0
 * Brand: THE X IDENTITY
 *
 * Privacy-first, in-memory conversations.
 * No browser persistence or account-wide history is enabled.
 * Authenticated persistence requires a separately audited server API.
 * No direct dependency on XSUS AI Core or Hyper XSUS Core.
 */

export const CHAT_VERSION = "3.2.0";

// Legacy storage is removed on initialization. Never write chat data here.
const LEGACY_STORAGE_KEY = "xsus-ai-v3-conversations";
const ASSISTANT_LOGO_PATH = "assets/images/xsus-ai-logo.png";
const MAX_CONVERSATIONS = 100;
const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 12000;
const VALID_ROLES = Object.freeze(["user", "assistant", "system"]);

function clearLegacyStorage() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage may be disabled. Chat remains usable in memory.
  }
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  throw new Error("Secure conversation IDs are unavailable.");
}

function timestamp() {
  return new Date().toISOString();
}

function createMessage(role, content, attachments = []) {
  if (!VALID_ROLES.includes(role)) {
    throw new TypeError("Invalid message role.");
  }

  return {
    id: createId(),
    role,
    content: String(content).slice(0, MAX_MESSAGE_LENGTH),
    attachments: attachments.map(file => ({
      name: String(file.name || ""),
      size: Number(file.size || 0),
      type: String(file.type || "")
    })),
    createdAt: timestamp()
  };
}

function createConversation() {
  const now = timestamp();

  return {
    id: createId(),
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: []
  };
}

function formatTitle(content) {
  const clean = content.trim().replace(/\s+/g, " ");

  if (!clean) return "New conversation";

  return clean.length > 48
    ? `${clean.slice(0, 48)}…`
    : clean;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function createMessageAvatar(role) {
  const avatar = createElement("div", "xsus-chat-avatar");

  if (role === "assistant") {
    avatar.classList.add("xsus-chat-avatar-assistant");
    avatar.setAttribute("aria-label", "XSUS AI");

    const image = document.createElement("img");
    image.src = ASSISTANT_LOGO_PATH;
    image.alt = "XSUS AI";
    image.width = 34;
    image.height = 34;
    image.decoding = "async";
    image.style.display = "block";
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "contain";

    avatar.append(image);
    return avatar;
  }

  avatar.textContent = "i";
  return avatar;
}

export function createChatController(options = {}) {
  const {
    messagesContainer,
    input,
    sendButton,
    conversationContainer = null,
    welcomeContainer = null,
    historyContainer = null,
    newChatButton = null,
    attachmentsController = null,
    onSend = null,
    onError = () => {},
    onConversationChange = () => {}
  } = options;

  if (!(messagesContainer instanceof HTMLElement)) {
    throw new TypeError(
      "XSUS Chat: messagesContainer is required."
    );
  }

  if (!(input instanceof HTMLTextAreaElement)) {
    throw new TypeError(
      "XSUS Chat: input must be a textarea."
    );
  }

  if (!(sendButton instanceof HTMLElement)) {
    throw new TypeError(
      "XSUS Chat: sendButton is required."
    );
  }

  // Remove legacy, shared-browser conversation history.
  clearLegacyStorage();

  let destroyed = false;
  let sending = false;
  let conversations = [];
  let activeConversationId = null;

  const cleanups = [];

  function listen(target, event, handler) {
    if (!target) return;

    target.addEventListener(event, handler);

    cleanups.push(() => {
      target.removeEventListener(event, handler);
    });
  }

  function getActiveConversation() {
    return conversations.find(
      item => item.id === activeConversationId
    ) || null;
  }

  function emitConversationChange() {
    onConversationChange({
      activeConversationId,
      conversations: getConversations()
    });
  }

  function getConversations() {
    return conversations.map(item => ({
      id: item.id,
      title: item.title,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      messageCount: item.messages.length
    }));
  }

  function updateSendButton() {
    sendButton.disabled =
      destroyed ||
      sending ||
      input.value.trim().length === 0;
  }

  function renderMessage(message) {
    const wrapper = createElement(
      "article",
      `xsus-chat-message is-${message.role}`
    );

    wrapper.dataset.messageId = message.id;

    if (message.role !== "user") {
      wrapper.append(createMessageAvatar(message.role));
    }

    const bubble = createElement("div", "xsus-chat-bubble");
    const content = createElement(
      "div",
      "xsus-chat-message-content"
    );

    // textContent prevents HTML injection.
    content.textContent = message.content;
    content.style.whiteSpace = "pre-wrap";

    bubble.append(content);

    if (message.attachments.length) {
      const attachmentList = createElement(
        "div",
        "xsus-chat-attachments"
      );

      for (const file of message.attachments) {
        attachmentList.append(
          createElement(
            "span",
            "xsus-chat-attachment",
            file.name
          )
        );
      }

      bubble.append(attachmentList);
    }

    wrapper.append(bubble);
    return wrapper;
  }

  function updateWorkspaceState(hasMessages) {
    if (conversationContainer) {
      conversationContainer.hidden = !hasMessages;
    }

    if (welcomeContainer) {
      welcomeContainer.hidden = hasMessages;
    }

    const workspace = messagesContainer.closest(
      ".xsus-ai-workspace"
    );

    if (workspace) {
      workspace.classList.toggle(
        "is-chatting",
        hasMessages
      );

      workspace.classList.toggle(
        "is-welcome",
        !hasMessages
      );
    }
  }

  function renderMessages() {
    messagesContainer.replaceChildren();

    const conversation = getActiveConversation();

    if (!conversation) {
      updateWorkspaceState(false);
      return;
    }

    for (const message of conversation.messages) {
      messagesContainer.append(renderMessage(message));
    }

    updateWorkspaceState(conversation.messages.length > 0);
    messagesContainer.scrollTop =
      messagesContainer.scrollHeight;
  }

  function renderHistory() {
    if (!historyContainer) return;

    historyContainer.replaceChildren();

    for (const conversation of conversations) {
      const item = createElement(
        "button",
        "xsus-sidebar-item",
        conversation.title
      );

      item.type = "button";
      item.dataset.conversationId = conversation.id;

      item.classList.toggle(
        "is-active",
        conversation.id === activeConversationId
      );

      item.addEventListener("click", () => {
        selectConversation(conversation.id);
      });

      historyContainer.append(item);
    }
  }

  function refresh() {
    if (destroyed) return;

    renderMessages();
    renderHistory();
    updateSendButton();
    emitConversationChange();
  }

  function newConversation() {
    if (destroyed || sending) return null;

    const conversation = createConversation();
    conversations.unshift(conversation);
    conversations = conversations.slice(0, MAX_CONVERSATIONS);
    activeConversationId = conversation.id;

    input.value = "";
    attachmentsController?.clearFiles?.();

    refresh();
    input.focus();

    return conversation.id;
  }

  function selectConversation(id) {
    if (destroyed || sending) return false;

    const exists = conversations.some(
      item => item.id === id
    );

    if (!exists) return false;

    activeConversationId = id;
    refresh();
    return true;
  }

  function deleteConversation(id) {
    if (destroyed || sending) return false;

    const exists = conversations.some(
      item => item.id === id
    );

    if (!exists) return false;

    conversations = conversations.filter(
      item => item.id !== id
    );

    if (activeConversationId === id) {
      activeConversationId = conversations[0]?.id || null;
    }

    refresh();
    return true;
  }

  function appendMessage(role, content, files = []) {
    const conversation = getActiveConversation();

    if (!conversation) {
      throw new Error("No active conversation.");
    }

    const message = createMessage(role, content, files);
    conversation.messages.push(message);
    conversation.messages =
      conversation.messages.slice(-MAX_MESSAGES);

    if (
      role === "user" &&
      conversation.messages.filter(
        item => item.role === "user"
      ).length === 1
    ) {
      conversation.title = formatTitle(content);
    }

    conversation.updatedAt = timestamp();
    refresh();

    return message;
  }

  function showTyping() {
    const wrapper = createElement(
      "div",
      "xsus-chat-message is-assistant"
    );

    wrapper.dataset.typing = "true";

    const avatar = createMessageAvatar("assistant");
    const typing = createElement("div", "xsus-chat-typing");

    for (let i = 0; i < 3; i++) {
      typing.append(createElement("span"));
    }

    wrapper.append(avatar, typing);
    messagesContainer.append(wrapper);

    messagesContainer.scrollTop =
      messagesContainer.scrollHeight;

    return wrapper;
  }

  async function sendMessage() {
    if (destroyed || sending) return false;

    const content = input.value.trim();

    if (!content) return false;

    if (content.length > MAX_MESSAGE_LENGTH) {
      onError("Mesazhi tejkalon kufirin e lejuar.");
      return false;
    }

    if (typeof onSend !== "function") {
      onError(
        "XSUS AI nuk është lidhur ende me motorin e përgjigjeve."
      );
      return false;
    }

    if (!getActiveConversation()) {
      newConversation();
    }

    const files =
      attachmentsController?.getFiles?.() || [];

    const userMessage = appendMessage(
      "user",
      content,
      files
    );

    input.value = "";
    attachmentsController?.clearFiles?.();

    sending = true;
    updateSendButton();

    const typingIndicator = showTyping();

    try {
      const conversation = getActiveConversation();

      const response = await onSend({
        conversationId: conversation.id,
        message: userMessage.content,
        attachments: files,
        history: conversation.messages.map(item => ({
          role: item.role,
          content: item.content
        }))
      });

      if (
        !response ||
        typeof response.answer !== "string" ||
        !response.answer.trim()
      ) {
        throw new Error("Invalid AI response.");
      }

      if (!destroyed) {
        typingIndicator.remove();
        appendMessage("assistant", response.answer);
      }

      return true;
    } catch (error) {
      typingIndicator.remove();

      if (!destroyed) {
        onError(
          error instanceof Error
            ? error.message
            : "Ndodhi një gabim gjatë përgjigjes."
        );
      }

      return false;
    } finally {
      sending = false;

      if (!destroyed) {
        updateSendButton();
      }
    }
  }

  function handleInputKeydown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.isComposing
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  listen(input, "input", updateSendButton);
  listen(input, "keydown", handleInputKeydown);
  listen(sendButton, "click", sendMessage);
  listen(newChatButton, "click", newConversation);

  refresh();

  return Object.freeze({
    newConversation,
    selectConversation,
    deleteConversation,
    sendMessage,

    getActiveConversationId: () =>
      activeConversationId,

    getConversations,

    getMessages: () => {
      const conversation = getActiveConversation();

      return conversation
        ? conversation.messages.map(item => ({
            ...item,
            attachments: item.attachments.map(
              file => ({ ...file })
            )
          }))
        : [];
    },

    refresh,

    destroy() {
      if (destroyed) return;

      destroyed = true;
      cleanups.forEach(cleanup => cleanup());

      conversations = [];
      activeConversationId = null;

      messagesContainer.replaceChildren();

      if (historyContainer) {
        historyContainer.replaceChildren();
      }
    }
  });
}
