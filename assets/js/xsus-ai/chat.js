
/**
 * XSUS AI V3 — Chat Controller
 * Version: 3.3.0
 * Brand: THE X IDENTITY
 *
 * Privacy-first, in-memory conversations.
 *
 * Responsibilities:
 * - Manage conversations in memory.
 * - Render chat messages and history.
 * - Coordinate sending messages.
 * - Import validated private history.
 * - Clear private history on account changes.
 * - Preserve existing public APIs.
 *
 * Security:
 * - No browser chat persistence.
 * - No direct Supabase database access.
 * - No service-role credentials.
 * - No direct dependency on XSUS AI Core.
 * - No dependency on Hyper XSUS Core.
 *
 * Authentication and RLS authorization
 * remain the responsibility of the
 * application and Supabase.
 */

import {
  normalizeConversations,
  normalizeMessages,
  validateConversationId
} from "./contracts/xsus-chat-history-contract.js";

export const CHAT_VERSION = "3.3.0";

/* ============================================
   CONSTANTS
============================================ */

const LEGACY_STORAGE_KEY =
  "xsus-ai-v3-conversations";

const ASSISTANT_LOGO_PATH =
  "assets/images/xsus-ai-logo.png";

const MAX_CONVERSATIONS = 100;
const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 12000;

const VALID_ROLES = Object.freeze([
  "user",
  "assistant",
  "system"
]);

/* ============================================
   UTILITIES
============================================ */

function clearLegacyStorage() {
  try {
    localStorage.removeItem(
      LEGACY_STORAGE_KEY
    );
  } catch {
    // Storage may be disabled.
    // Chat remains usable in memory.
  }
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  throw new Error(
    "Secure conversation IDs are unavailable."
  );
}

function timestamp() {
  return new Date().toISOString();
}

function createMessage(
  role,
  content,
  attachments = []
) {
  if (!VALID_ROLES.includes(role)) {
    throw new TypeError(
      "Invalid message role."
    );
  }

  return {
    id: createId(),
    role,
    content: String(content).slice(
      0,
      MAX_MESSAGE_LENGTH
    ),

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
  const clean = content
    .trim()
    .replace(/\s+/g, " ");

  if (!clean) {
    return "New conversation";
  }

  return clean.length > 48
    ? `${clean.slice(0, 48)}…`
    : clean;
}

function createElement(
  tag,
  className,
  text
) {
  const element =
    document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function createMessageAvatar(role) {
  const avatar = createElement(
    "div",
    "xsus-chat-avatar"
  );

  if (role === "assistant") {
    avatar.classList.add(
      "xsus-chat-avatar-assistant"
    );

    avatar.setAttribute(
      "aria-label",
      "XSUS AI"
    );

    const image =
      document.createElement("img");

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

/* ============================================
   CHAT CONTROLLER
============================================ */

export function createChatController(
  options = {}
) {
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

  /* ==========================================
     ELEMENT VALIDATION
  ========================================== */

  if (
    !(messagesContainer instanceof HTMLElement)
  ) {
    throw new TypeError(
      "XSUS Chat: messagesContainer is required."
    );
  }

  if (
    !(input instanceof HTMLTextAreaElement)
  ) {
    throw new TypeError(
      "XSUS Chat: input must be a textarea."
    );
  }

  if (
    !(sendButton instanceof HTMLElement)
  ) {
    throw new TypeError(
      "XSUS Chat: sendButton is required."
    );
  }

  // Remove legacy shared-browser history.
  clearLegacyStorage();

  /* ==========================================
     INTERNAL STATE
  ========================================== */

  let destroyed = false;
  let sending = false;

  let conversations = [];
  let activeConversationId = null;

  // Invalidates pending AI responses whenever
  // private history is cleared or controller
  // is destroyed.
  let lifecycleGeneration = 0;

  const cleanups = [];

  /* ==========================================
     EVENT MANAGEMENT
  ========================================== */

  function listen(
    target,
    event,
    handler
  ) {
    if (!target) {
      return;
    }

    target.addEventListener(
      event,
      handler
    );

    cleanups.push(() => {
      target.removeEventListener(
        event,
        handler
      );
    });
  }

  /* ==========================================
     CONVERSATION ACCESS
  ========================================== */

  function getActiveConversation() {
    return conversations.find(
      item =>
        item.id === activeConversationId
    ) || null;
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

  function getMessages() {
    const conversation =
      getActiveConversation();

    return conversation
      ? conversation.messages.map(item => ({
          ...item,

          attachments:
            item.attachments.map(
              file => ({ ...file })
            )
        }))
      : [];
  }

  function emitConversationChange() {
    onConversationChange({
      activeConversationId,
      conversations: getConversations()
    });
  }

  /* ==========================================
     SEND BUTTON
  ========================================== */

  function updateSendButton() {
    sendButton.disabled =
      destroyed ||
      sending ||
      input.value.trim().length === 0;
  }

  /* ==========================================
     MESSAGE RENDERING
  ========================================== */

  function renderMessage(message) {
    const wrapper = createElement(
      "article",
      `xsus-chat-message is-${message.role}`
    );

    wrapper.dataset.messageId =
      message.id;

    if (message.role !== "user") {
      wrapper.append(
        createMessageAvatar(message.role)
      );
    }

    const bubble = createElement(
      "div",
      "xsus-chat-bubble"
    );

    const content = createElement(
      "div",
      "xsus-chat-message-content"
    );

    // Prevent HTML injection.
    content.textContent =
      message.content;

    content.style.whiteSpace =
      "pre-wrap";

    bubble.append(content);

    if (message.attachments.length) {
      const attachmentList =
        createElement(
          "div",
          "xsus-chat-attachments"
        );

      for (
        const file of message.attachments
      ) {
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

  /* ==========================================
     WORKSPACE STATE
  ========================================== */

  function updateWorkspaceState(
    hasMessages
  ) {
    if (conversationContainer) {
      conversationContainer.hidden =
        !hasMessages;
    }

    if (welcomeContainer) {
      welcomeContainer.hidden =
        hasMessages;
    }

    const workspace =
      messagesContainer.closest(
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

    const conversation =
      getActiveConversation();

    if (!conversation) {
      updateWorkspaceState(false);
      return;
    }

    for (
      const message of conversation.messages
    ) {
      messagesContainer.append(
        renderMessage(message)
      );
    }

    updateWorkspaceState(
      conversation.messages.length > 0
    );

    messagesContainer.scrollTop =
      messagesContainer.scrollHeight;
  }

  /* ==========================================
     HISTORY RENDERING
  ========================================== */

  function renderHistory() {
    if (!historyContainer) {
      return;
    }

    historyContainer.replaceChildren();

    for (
      const conversation of conversations
    ) {
      const item = createElement(
        "button",
        "xsus-sidebar-item",
        conversation.title
      );

      item.type = "button";

      item.dataset.conversationId =
        conversation.id;

      item.classList.toggle(
        "is-active",
        conversation.id ===
          activeConversationId
      );

      item.addEventListener(
        "click",
        () => {
          selectConversation(
            conversation.id
          );
        }
      );

      historyContainer.append(item);
    }
  }

  function refresh() {
    if (destroyed) {
      return;
    }

    renderMessages();
    renderHistory();
    updateSendButton();
    emitConversationChange();
  }

  /* ==========================================
     PRIVATE HISTORY HYDRATION
     PHASE 22.16.5.2
  ========================================== */

  /**
   * Imports previously normalized
   * private conversation history.
   *
   * Expected input:
   *
   * {
   *   conversations: [
   *     {
   *       id,
   *       title,
   *       createdAt,
   *       updatedAt
   *     }
   *   ],
   *
   *   messagesByConversation: {
   *     [conversationId]: [
   *       {
   *         id,
   *         conversationId,
   *         role,
   *         content,
   *         createdAt
   *       }
   *     ]
   *   }
   * }
   *
   * Does not:
   * - Authenticate users.
   * - Query the database.
   * - Grant access permissions.
   * - Write to browser storage.
   *
   * Caller must verify account identity
   * and RLS-authorized data beforehand.
   */

  function hydrateHistory({
    conversations: incomingConversations,
    messagesByConversation = {}
  } = {}) {
    if (destroyed || sending) {
      return false;
    }

    if (
      !Array.isArray(
        incomingConversations
      )
    ) {
      throw new TypeError(
        "Invalid conversation collection."
      );
    }

    if (
      incomingConversations.length >
      MAX_CONVERSATIONS
    ) {
      throw new RangeError(
        "Conversation limit exceeded."
      );
    }

    if (
      messagesByConversation === null ||
      typeof messagesByConversation !==
        "object" ||
      Array.isArray(
        messagesByConversation
      )
    ) {
      throw new TypeError(
        "Invalid message collection."
      );
    }

    /*
     * Convert normalized application
     * records into database-shaped
     * records for contract validation.
     *
     * This avoids maintaining a second,
     * weaker validation implementation.
     */

    const databaseConversations =
      incomingConversations.map(
        record => ({
          id: record?.id,
          title: record?.title,
          created_at:
            record?.createdAt,
          updated_at:
            record?.updatedAt
        })
      );

    const validatedConversations =
      normalizeConversations(
        databaseConversations
      );

    const seenConversationIds =
      new Set();

    const nextConversations = [];

    for (
      const record of
      validatedConversations
    ) {
      const conversationId =
        validateConversationId(
          record.id
        );

      const normalizedId =
        conversationId.toLowerCase();

      if (
        seenConversationIds.has(
          normalizedId
        )
      ) {
        throw new TypeError(
          "Duplicate conversation ID."
        );
      }

      seenConversationIds.add(
        normalizedId
      );

      /*
       * Support exact and lowercase
       * conversation keys.
       */

      const sourceMessages =
        messagesByConversation[
          conversationId
        ] ??
        messagesByConversation[
          normalizedId
        ] ??
        [];

      if (
        !Array.isArray(
          sourceMessages
        )
      ) {
        throw new TypeError(
          "Invalid message collection."
        );
      }

      if (
        sourceMessages.length >
        MAX_MESSAGES
      ) {
        throw new RangeError(
          "Message limit exceeded."
        );
      }

      const databaseMessages =
        sourceMessages.map(
          item => ({
            id: item?.id,
            conversation_id:
              item?.conversationId,
            role: item?.role,
            content: item?.content,
            created_at:
              item?.createdAt
          })
        );

      const validatedMessages =
        normalizeMessages(
          databaseMessages,
          conversationId
        );

      const seenMessageIds =
        new Set();

      const nextMessages =
        validatedMessages.map(
          item => {
            const normalizedMessageId =
              item.id.toLowerCase();

            if (
              seenMessageIds.has(
                normalizedMessageId
              )
            ) {
              throw new TypeError(
                "Duplicate message ID."
              );
            }

            seenMessageIds.add(
              normalizedMessageId
            );

            return {
              id: item.id,
              role: item.role,
              content: item.content,
              createdAt:
                item.createdAt,

              // Attachments are not part
              // of the private history
              // database contract yet.
              attachments: []
            };
          }
        );

      nextConversations.push({
        id: conversationId,
        title: record.title,
        createdAt:
          record.createdAt,
        updatedAt:
          record.updatedAt,
        messages: nextMessages
      });
    }

    /*
     * Atomic commit.
     *
     * If validation fails above,
     * existing chat state remains
     * unchanged.
     */

    conversations =
      nextConversations;

    activeConversationId =
      conversations[0]?.id ?? null;

    input.value = "";

    attachmentsController
      ?.clearFiles?.();

    refresh();

    return true;
  }

  /* ==========================================
     CLEAR PRIVATE HISTORY
  ========================================== */

  /**
   * Clears all conversations and
   * messages from application memory.
   *
   * Intended for:
   * - Sign-out.
   * - Account switching.
   * - Session invalidation.
   *
   * Does not delete database records.
   */

  function clearHistory() {
    if (destroyed) {
      return false;
    }

    // Invalidate any in-flight AI response.
    lifecycleGeneration += 1;

    conversations = [];
    activeConversationId = null;

    input.value = "";

    attachmentsController
      ?.clearFiles?.();

    // Allow the UI to become usable
    // immediately after account changes.
    sending = false;

    refresh();

    return true;
  }

  /* ==========================================
     NEW CONVERSATION
  ========================================== */

  function newConversation() {
    if (destroyed || sending) {
      return null;
    }

    const conversation =
      createConversation();

    conversations.unshift(
      conversation
    );

    conversations =
      conversations.slice(
        0,
        MAX_CONVERSATIONS
      );

    activeConversationId =
      conversation.id;

    input.value = "";

    attachmentsController
      ?.clearFiles?.();

    refresh();

    input.focus();

    return conversation.id;
  }

  /* ==========================================
     SELECT CONVERSATION
  ========================================== */

  function selectConversation(id) {
    if (destroyed || sending) {
      return false;
    }

    const exists =
      conversations.some(
        item => item.id === id
      );

    if (!exists) {
      return false;
    }

    activeConversationId = id;

    refresh();

    return true;
  }

  /* ==========================================
     DELETE CONVERSATION
  ========================================== */

  function deleteConversation(id) {
    if (destroyed || sending) {
      return false;
    }

    const exists =
      conversations.some(
        item => item.id === id
      );

    if (!exists) {
      return false;
    }

    conversations =
      conversations.filter(
        item => item.id !== id
      );

    if (
      activeConversationId === id
    ) {
      activeConversationId =
        conversations[0]?.id || null;
    }

    refresh();

    return true;
  }

  /* ==========================================
     APPEND MESSAGE
  ========================================== */

  function appendMessage(
    role,
    content,
    files = []
  ) {
    const conversation =
      getActiveConversation();

    if (!conversation) {
      throw new Error(
        "No active conversation."
      );
    }

    const message = createMessage(
      role,
      content,
      files
    );

    conversation.messages.push(
      message
    );

    conversation.messages =
      conversation.messages.slice(
        -MAX_MESSAGES
      );

    if (
      role === "user" &&
      conversation.messages.filter(
        item =>
          item.role === "user"
      ).length === 1
    ) {
      conversation.title =
        formatTitle(content);
    }

    conversation.updatedAt =
      timestamp();

    refresh();

    return message;
  }

  /* ==========================================
     TYPING INDICATOR
  ========================================== */

  function showTyping() {
    const wrapper = createElement(
      "div",
      "xsus-chat-message is-assistant"
    );

    wrapper.dataset.typing =
      "true";

    const avatar =
      createMessageAvatar(
        "assistant"
      );

    const typing = createElement(
      "div",
      "xsus-chat-typing"
    );

    for (
      let i = 0;
      i < 3;
      i++
    ) {
      typing.append(
        createElement("span")
      );
    }

    wrapper.append(
      avatar,
      typing
    );

    messagesContainer.append(
      wrapper
    );

    messagesContainer.scrollTop =
      messagesContainer.scrollHeight;

    return wrapper;
  }

  /* ==========================================
     SEND MESSAGE
  ========================================== */

  async function sendMessage() {
    if (destroyed || sending) {
      return false;
    }

    const content =
      input.value.trim();

    if (!content) {
      return false;
    }

    if (
      content.length >
      MAX_MESSAGE_LENGTH
    ) {
      onError(
        "Mesazhi tejkalon kufirin e lejuar."
      );

      return false;
    }

    if (
      typeof onSend !== "function"
    ) {
      onError(
        "XSUS AI nuk është lidhur ende me motorin e përgjigjeve."
      );

      return false;
    }

    if (
      !getActiveConversation()
    ) {
      newConversation();
    }

    const files =
      attachmentsController
        ?.getFiles?.() || [];

    const userMessage =
      appendMessage(
        "user",
        content,
        files
      );

    const requestConversation =
      getActiveConversation();

    const requestConversationId =
      requestConversation.id;

    const requestGeneration =
      lifecycleGeneration;

    const requestHistory =
      requestConversation.messages.map(
        item => ({
          role: item.role,
          content: item.content
        })
      );

    input.value = "";

    attachmentsController
      ?.clearFiles?.();

    sending = true;

    updateSendButton();

    const typingIndicator =
      showTyping();

    try {
      const response =
        await onSend({
          conversationId:
            requestConversationId,

          message:
            userMessage.content,

          messageId:
            userMessage.id,

          attachments: files,

          history:
            requestHistory
        });

      /*
       * Ignore responses belonging
       * to an invalidated lifecycle.
       */

      if (
        destroyed ||
        requestGeneration !==
          lifecycleGeneration
      ) {
        return false;
      }

      if (
        !response ||
        typeof response.answer !==
          "string" ||
        !response.answer.trim()
      ) {
        throw new Error(
          "Invalid AI response."
        );
      }

      const currentConversation =
        getActiveConversation();

      if (
        !currentConversation ||
        currentConversation.id !==
          requestConversationId
      ) {
        return false;
      }

      typingIndicator.remove();

      appendMessage(
        "assistant",
        response.answer
      );

      return true;

    } catch (error) {
      if (
        !destroyed &&
        requestGeneration ===
          lifecycleGeneration
      ) {
        onError(
          error instanceof Error
            ? error.message
            : "Ndodhi një gabim gjatë përgjigjes."
        );
      }

      return false;

    } finally {
      typingIndicator.remove();

      /*
       * A previous request must not
       * overwrite the sending state
       * of a newer lifecycle.
       */

      if (
        requestGeneration ===
        lifecycleGeneration
      ) {
        sending = false;

        if (!destroyed) {
          updateSendButton();
        }
      }
    }
  }

  /* ==========================================
     KEYBOARD HANDLER
  ========================================== */

  function handleInputKeydown(
    event
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.isComposing
    ) {
      event.preventDefault();

      sendMessage();
    }
  }

  /* ==========================================
     EVENT BINDINGS
  ========================================== */

  listen(
    input,
    "input",
    updateSendButton
  );

  listen(
    input,
    "keydown",
    handleInputKeydown
  );

  listen(
    sendButton,
    "click",
    sendMessage
  );

  listen(
    newChatButton,
    "click",
    newConversation
  );

  /* ==========================================
     INITIAL RENDER
  ========================================== */

  refresh();

  /* ==========================================
     PUBLIC API
  ========================================== */

  return Object.freeze({
    newConversation,
    selectConversation,
    deleteConversation,
    sendMessage,

    hydrateHistory,
    clearHistory,

    getActiveConversationId: () =>
      activeConversationId,

    getConversations,
    getMessages,

    refresh,

    destroy() {
      if (destroyed) {
        return;
      }

      lifecycleGeneration += 1;

      destroyed = true;
      sending = false;

      cleanups.forEach(
        cleanup => cleanup()
      );

      conversations = [];
      activeConversationId = null;

      input.value = "";

      attachmentsController
        ?.clearFiles?.();

      messagesContainer
        .replaceChildren();

      if (historyContainer) {
        historyContainer
          .replaceChildren();
      }
    }
  });
}
