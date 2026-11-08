
/**
 * XSUS AI V3 — Main Application Controller
 * Version: 3.0.0
 * Brand: THE X IDENTITY
 *
 * Responsibilities:
 * - Initialize UI modules
 * - Connect chat, navigation, language and tools
 * - Coordinate interface state
 * - Provide controlled AI adapter boundary
 * - Handle errors and lifecycle
 *
 * No direct dependency on XSUS AI Core
 * or Hyper XSUS Core.
 */

import {
  createNavigation
} from "./navigation.js";

import {
  createPlusMenu
} from "./plus-menu.js";

import {
  createLanguageController
} from "./language.js";

import {
  createChatController
} from "./chat.js";

/**
 * XSUS AI Core HTTP Adapter
 *
 * Communicates with XSUS AI Core through
 * the controlled HTTP integration boundary.
 *
 * Does not import internal AI Core modules.
 */
import {
  createXSUSCoreAdapter
} from "./adapters/xsus-ai-core-adapter.js";

export const XSUS_APP_VERSION = "3.0.0";

const SELECTORS = Object.freeze({
  app: ".xsus-ai-app",

  sidebar: ".xsus-ai-sidebar",
  sidebarToggle: "[data-sidebar-toggle]",
  sidebarClose: "[data-sidebar-close]",
  sidebarCollapse: "[data-sidebar-collapse]",
  sidebarBackdrop: ".xsus-sidebar-backdrop",

  headerNav: ".xsus-ai-header-nav",
  headerMenuToggle: ".xsus-ai-menu-toggle",

  workspace: ".xsus-ai-workspace",

  messages: ".xsus-conversation-messages",
  conversation: ".xsus-conversation",
  welcome: ".xsus-ai-welcome",

  chatInput: ".xsus-chat-input",
  sendButton: ".xsus-send-button",

  plusButton: ".xsus-plus-button",
  plusMenu: ".xsus-plus-menu",
  attachments: ".xsus-chat-attachments",

  history: ".xsus-sidebar-history",

  newChat: "[data-action='new-chat']",

  error: "[data-xsus-error]"
});

function find(root, selector) {
  return root.querySelector(selector);
}

function required(root, selector) {
  const element = find(root, selector);

  if (!element) {
    throw new Error(
      `XSUS AI V3: Required element missing: ${selector}`
    );
  }

  return element;
}

function createErrorPresenter(root) {
  const container = find(root, SELECTORS.error);

  let hideTimer = null;

  function clearTimer() {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function show(message) {
    const text =
      typeof message === "string"
        ? message
        : "An unexpected error occurred.";

    console.error("[XSUS AI V3]", text);

    if (!container) return;

    clearTimer();

    container.textContent = text;
    container.hidden = false;
    container.setAttribute("role", "alert");

    hideTimer = setTimeout(() => {
      container.hidden = true;
      hideTimer = null;
    }, 6000);
  }

  function destroy() {
    clearTimer();

    if (container) {
      container.hidden = true;
    }
  }

  return Object.freeze({
    show,
    destroy
  });
}

/**
 * AI adapter contract:
 *
 * async function adapter({
 *   conversationId,
 *   message,
 *   attachments,
 *   history
 * }) {
 *   return { answer: "..." };
 * }
 *
 * The adapter must be explicitly supplied.
 * No simulated AI responses.
 */

function normalizeAIAdapter(adapter) {
  if (adapter == null) {
    return null;
  }

  if (typeof adapter !== "function") {
    throw new TypeError(
      "XSUS AI V3: AI adapter must be a function."
    );
  }

  return adapter;
}

export function createXSUSAIApp(options = {}) {
  const {
    root = document,
    aiAdapter = null,
    onReady = () => {},
    onError = () => {},
    onNavigate = () => {}
  } = options;

  const app = required(root, SELECTORS.app);

  if (app.dataset.xsusInitialized === "true") {
    throw new Error(
      "XSUS AI V3 has already been initialized."
    );
  }

  const sidebar = required(
    root,
    SELECTORS.sidebar
  );

  const messagesContainer = required(
    root,
    SELECTORS.messages
  );

  const chatInput = required(
    root,
    SELECTORS.chatInput
  );

  const sendButton = required(
    root,
    SELECTORS.sendButton
  );

  const plusButton = required(
    root,
    SELECTORS.plusButton
  );

  const plusMenu = required(
    root,
    SELECTORS.plusMenu
  );

  const errorPresenter = createErrorPresenter(root);

  const adapter = normalizeAIAdapter(aiAdapter);

  let destroyed = false;

  let languageController = null;
  let navigationController = null;
  let plusMenuController = null;
  let chatController = null;

  const cleanups = [];

  function reportError(error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    errorPresenter.show(message);
    onError(message);
  }

  function listen(target, eventName, handler) {
    if (!target) return;

    target.addEventListener(eventName, handler);

    cleanups.push(() => {
      target.removeEventListener(eventName, handler);
    });
  }

  function updateLanguage(language) {
    app.dataset.language = language;

    // Dynamic menus can be refreshed here
    // when their translation adapters are added.
  }

  function handleNavigation(section) {
    app.dataset.activeSection = section;

    onNavigate(section);
  }

  async function handleAISend(request) {
    if (!adapter) {
      throw new Error(
        "XSUS AI Core is not connected yet."
      );
    }

    return adapter(request);
  }

  function initializeLanguage() {
    languageController = createLanguageController({
      root,

      onLanguageChange(language) {
        updateLanguage(language);
      }
    });

    updateLanguage(
      languageController.getLanguage()
    );
  }

  function initializePlusMenu() {
    plusMenuController = createPlusMenu({
      button: plusButton,
      menu: plusMenu,

      attachmentsContainer: find(
        root,
        SELECTORS.attachments
      ),

      onFilesChange(files) {
        app.dataset.attachmentCount =
          String(files.length);
      },

      onToolSelect(tool) {
        app.dispatchEvent(
          new CustomEvent("xsus:tool-select", {
            detail: {
              tool
            }
          })
        );
      },

      onError: reportError
    });
  }

  function initializeChat() {
    chatController = createChatController({
      messagesContainer,
      input: chatInput,
      sendButton,

      conversationContainer: find(
        root,
        SELECTORS.conversation
      ),

      welcomeContainer: find(
        root,
        SELECTORS.welcome
      ),

      historyContainer: find(
        root,
        SELECTORS.history
      ),

      attachmentsController: plusMenuController,

      onSend: handleAISend,

      onError: reportError,

      onConversationChange(state) {
        app.dataset.conversationCount =
          String(state.conversations.length);

        app.dataset.activeConversationId =
          state.activeConversationId || "";
      }
    });
  }

  function initializeNavigation() {
    navigationController = createNavigation({
      sidebar,

      sidebarToggle: find(
        root,
        SELECTORS.sidebarToggle
      ),

      sidebarClose: find(
        root,
        SELECTORS.sidebarClose
      ),

      sidebarCollapse: find(
        root,
        SELECTORS.sidebarCollapse
      ),

      sidebarBackdrop: find(
        root,
        SELECTORS.sidebarBackdrop
      ),

      headerNav: find(
        root,
        SELECTORS.headerNav
      ),

      headerMenuToggle: find(
        root,
        SELECTORS.headerMenuToggle
      ),

      workspace: find(
        root,
        SELECTORS.workspace
      ),

      onNavigate: handleNavigation,

      onNewChat() {
        chatController?.newConversation();
      }
    });
  }

  function initializeNewChatActions() {
    // Sidebar new-chat actions are already
    // handled by the navigation controller.
    //
    // Bind only buttons outside the sidebar.

    const buttons = root.querySelectorAll(
      SELECTORS.newChat
    );

    buttons.forEach(button => {
      if (sidebar.contains(button)) {
        return;
      }

      listen(button, "click", () => {
        chatController?.newConversation();
        navigationController?.navigate("chat");
      });
    });
  }

  function initializeSuggestions() {
    const suggestions = root.querySelectorAll(
      "[data-suggestion]"
    );

    suggestions.forEach(button => {
      listen(button, "click", () => {
        const suggestion =
          button.dataset.suggestion;

        if (!suggestion) return;

        chatInput.value = suggestion;

        chatInput.dispatchEvent(
          new Event("input", {
            bubbles: true
          })
        );

        chatInput.focus();
      });
    });
  }

  function initialize() {
    try {
      initializeLanguage();
      initializePlusMenu();
      initializeChat();
      initializeNavigation();

      initializeNewChatActions();
      initializeSuggestions();

      app.dataset.xsusInitialized = "true";

      app.dataset.aiConnected = String(
        Boolean(adapter)
      );

      onReady({
        version: XSUS_APP_VERSION,
        aiConnected: Boolean(adapter)
      });
    } catch (error) {
      navigationController?.destroy();
      chatController?.destroy();
      plusMenuController?.destroy();
      languageController?.destroy();

      cleanups.forEach(cleanup => cleanup());

      errorPresenter.destroy();

      throw error;
    }
  }

  initialize();

  return Object.freeze({
    version: XSUS_APP_VERSION,

    getLanguage() {
      return languageController?.getLanguage();
    },

    setLanguage(language) {
      return languageController?.setLanguage(
        language
      ) || false;
    },

    newChat() {
      return chatController?.newConversation();
    },

    sendMessage() {
      return chatController?.sendMessage();
    },

    getConversations() {
      return chatController?.getConversations() || [];
    },

    navigate(section) {
      return navigationController?.navigate(
        section
      ) || false;
    },

    getAttachments() {
      return plusMenuController?.getFiles() || [];
    },

    isAIConnected() {
      return Boolean(adapter);
    },

    destroy() {
      if (destroyed) return;

      destroyed = true;

      cleanups.forEach(cleanup => cleanup());

      navigationController?.destroy();
      chatController?.destroy();
      plusMenuController?.destroy();
      languageController?.destroy();

      errorPresenter.destroy();

      delete app.dataset.xsusInitialized;
    }
  });
}

/**
 * Browser initialization.
 *
 * Runs only when the V3 application root
 * is present in the document.
 *
 * The real XSUS AI Core HTTP adapter is
 * explicitly supplied at this boundary.
 */

function bootXSUSAI() {
  const app = document.querySelector(
    SELECTORS.app
  );

  if (!app) return;

  if (app.dataset.xsusInitialized === "true") {
    return;
  }

  try {
    const instance = createXSUSAIApp({
      aiAdapter: createXSUSCoreAdapter({
        getLanguage: () => {
          const select = document.querySelector(
            "[data-xsus-language-select]"
          );

          return select?.value || "sq";
        }
      })
    });

    window.XSUSAI = instance;
  } catch (error) {
    console.error(
      "[XSUS AI V3] Initialization failed:",
      error
    );
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      bootXSUSAI,
      { once: true }
    );
  } else {
    bootXSUSAI();
  }
}
