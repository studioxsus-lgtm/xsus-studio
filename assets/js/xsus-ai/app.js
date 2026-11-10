
/**
 * XSUS AI V3 — Main Application Controller
 * Version: 3.1.0
 * Phase: 22.16.5.5
 * Brand: THE X IDENTITY
 *
 * Responsibilities:
 * - Initialize UI modules.
 * - Connect chat, navigation, language and tools.
 * - Integrate private Supabase history session.
 * - Coordinate application state.
 * - Preserve the controlled AI HTTP boundary.
 * - Handle errors and lifecycle cleanup.
 *
 * Private history:
 * - Read-only Supabase integration.
 * - No browser conversation persistence.
 * - No direct database writes.
 *
 * XSUS AI Core and Hyper XSUS Core remain
 * independent from this application.
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

import {
  createXSUSCoreAdapter
} from "./adapters/xsus-ai-core-adapter.js";

import {
  createPrivateHistorySession
} from "./adapters/xsus-private-history-session.js";

import { supabase } from "../../../services/supabase-client.js";
import { createMyConversation } from "./adapters/xsus-chat-history-write-adapter.js";
import { createPrivateIdempotentWriteService } from "./adapters/xsus-private-idempotent-write-service.js";
import { createPrivateChatPersistence } from "./adapters/xsus-private-chat-persistence.js";

export const XSUS_APP_VERSION = "3.1.0";

/* ============================================
   SELECTORS
============================================ */

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

/* ============================================
   DOM UTILITIES
============================================ */

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

/* ============================================
   ERROR PRESENTER
============================================ */

function createErrorPresenter(root) {
  const container = find(
    root,
    SELECTORS.error
  );

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

    console.error(
      "[XSUS AI V3]",
      text
    );

    if (!container) return;

    clearTimer();

    container.textContent = text;
    container.hidden = false;

    container.setAttribute(
      "role",
      "alert"
    );

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

/* ============================================
   AI ADAPTER VALIDATION
============================================ */

/**
 * AI adapter contract:
 *
 * async function adapter({
 *   conversationId,
 *   message,
 *   attachments,
 *   history
 * }) {
 *   return {
 *     answer: "..."
 *   };
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

/* ============================================
   MAIN APPLICATION
============================================ */

export function createXSUSAIApp(options = {}) {
  const {
    root = document,
    aiAdapter = null,
    enablePrivateHistory = true,
    enablePrivateWrites = false,
    onReady = () => {},
    onError = () => {},
    onNavigate = () => {}
  } = options;

  const app = required(
    root,
    SELECTORS.app
  );

  if (
    app.dataset.xsusInitialized === "true"
  ) {
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

  const errorPresenter =
    createErrorPresenter(root);

  const adapter =
    normalizeAIAdapter(aiAdapter);

  let destroyed = false;

  let languageController = null;
  let navigationController = null;
  let plusMenuController = null;
  let chatController = null;
  let privateHistorySession = null;
  let privateWriteService = null;
  let privateChatPersistence = null;

  const cleanups = [];

  /* ==========================================
     ERRORS
  ========================================== */

  function reportError(error) {
    if (destroyed) return;

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    errorPresenter.show(message);

    onError(message);
  }

  /* ==========================================
     EVENTS
  ========================================== */

  function listen(
    target,
    eventName,
    handler
  ) {
    if (!target) return;

    target.addEventListener(
      eventName,
      handler
    );

    cleanups.push(() => {
      target.removeEventListener(
        eventName,
        handler
      );
    });
  }

  /* ==========================================
     LANGUAGE
  ========================================== */

  function updateLanguage(language) {
    app.dataset.language =
      language;
  }

  function initializeLanguage() {
    languageController =
      createLanguageController({
        root,

        onLanguageChange(language) {
          updateLanguage(language);
        }
      });

    updateLanguage(
      languageController.getLanguage()
    );
  }

  /* ==========================================
     NAVIGATION
  ========================================== */

  function handleNavigation(section) {
    app.dataset.activeSection =
      section;

    onNavigate(section);
  }

  /* ==========================================
     AI COMMUNICATION
  ========================================== */

  async function handleAISend(request) {
    if (!adapter) {
      throw new Error(
        "XSUS AI Core is not connected yet."
      );
    }

    if (enablePrivateWrites) {
      if (!enablePrivateHistory || !privateChatPersistence) {
        throw new Error("Private chat persistence is not ready.");
      }
      if (!privateHistorySession?.getCurrentUserId()) {
        throw new Error("Sign in before saving a private chat.");
      }
      await privateChatPersistence.save({
        localConversationId: request.conversationId,
        localMessageId: request.messageId,
        content: request.message
      });
    }

    return adapter(request);
  }

  /* ==========================================
     PLUS MENU
  ========================================== */

  function initializePlusMenu() {
    plusMenuController =
      createPlusMenu({
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
            new CustomEvent(
              "xsus:tool-select",
              {
                detail: {
                  tool
                }
              }
            )
          );
        },

        onError: reportError
      });
  }

  /* ==========================================
     CHAT CONTROLLER
  ========================================== */

  function initializeChat() {
    chatController =
      createChatController({
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

        attachmentsController:
          plusMenuController,

        onSend: handleAISend,

        onError: reportError,

        onConversationChange(state) {
          if (destroyed) return;

          app.dataset.conversationCount =
            String(
              state.conversations.length
            );

          app.dataset.activeConversationId =
            state.activeConversationId || "";
        }
      });
  }

  /* ==========================================
     PRIVATE HISTORY SESSION
  ========================================== */

  function handleHistoryStatus({
    status,
    userId
  }) {
    if (destroyed) return;

    app.dataset.historyStatus =
      status;
    if (enablePrivateWrites &&
        (status === "signed-out" || status === "identity-changed")) {
      privateChatPersistence?.invalidate();
      privateWriteService?.invalidate();
    }

    app.dataset.authenticated =
      String(Boolean(userId));

    /*
     * Never expose the Supabase user ID
     * through DOM dataset attributes.
     */
  }

  function initializePrivateWrites() {
    if (!enablePrivateWrites) return;
    if (!enablePrivateHistory) {
      throw new Error("Private writes require private history.");
    }
    privateWriteService =
      createPrivateIdempotentWriteService({ supabase });
    privateChatPersistence = createPrivateChatPersistence({
      createConversation: createMyConversation,
      createOperationId: privateWriteService.createOperationId,
      saveUserMessage: args => privateWriteService.save(args)
    });
  }

  function initializePrivateHistory() {
    if (!enablePrivateHistory) {
      app.dataset.historyStatus =
        "disabled";

      app.dataset.authenticated =
        "false";

      return;
    }

    privateHistorySession =
      createPrivateHistorySession({
        chatController,

        onError: reportError,

        onStatusChange:
          handleHistoryStatus
      });

    const started =
      privateHistorySession.start();

    if (!started) {
      throw new Error(
        "XSUS AI: Private history session could not start."
      );
    }
  }

  /* ==========================================
     NAVIGATION CONTROLLER
  ========================================== */

  function initializeNavigation() {
    navigationController =
      createNavigation({
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

        onNavigate:
          handleNavigation,

        onNewChat() {
          chatController
            ?.newConversation();
        }
      });
  }

  /* ==========================================
     NEW CHAT ACTIONS
  ========================================== */

  function initializeNewChatActions() {
    const buttons =
      root.querySelectorAll(
        SELECTORS.newChat
      );

    buttons.forEach(button => {
      if (
        sidebar.contains(button)
      ) {
        return;
      }

      listen(
        button,
        "click",
        () => {
          chatController
            ?.newConversation();

          navigationController
            ?.navigate("chat");
        }
      );
    });
  }

  /* ==========================================
     SUGGESTIONS
  ========================================== */

  function initializeSuggestions() {
    const suggestions =
      root.querySelectorAll(
        "[data-suggestion]"
      );

    suggestions.forEach(button => {
      listen(
        button,
        "click",
        () => {
          const suggestion =
            button.dataset.suggestion;

          if (!suggestion) {
            return;
          }

          chatInput.value =
            suggestion;

          chatInput.dispatchEvent(
            new Event(
              "input",
              {
                bubbles: true
              }
            )
          );

          chatInput.focus();
        }
      );
    });
  }

  /* ==========================================
     INITIALIZATION
  ========================================== */

  function initialize() {
    try {
      initializeLanguage();

      initializePlusMenu();

      initializePrivateWrites();
      initializeChat();

      initializeNavigation();

      initializeNewChatActions();

      initializeSuggestions();

      /*
       * Start private history only after
       * the chat controller is ready.
       */
      initializePrivateHistory();

      app.dataset.xsusInitialized =
        "true";

      app.dataset.aiConnected =
        String(
          Boolean(adapter)
        );

      onReady({
        version:
          XSUS_APP_VERSION,

        aiConnected:
          Boolean(adapter),

        privateHistoryEnabled:
          Boolean(
            enablePrivateHistory
          )
      });

    } catch (error) {
      privateChatPersistence?.destroy();
      privateWriteService?.destroy();
      privateHistorySession
        ?.destroy();

      navigationController
        ?.destroy();

      chatController
        ?.destroy();

      plusMenuController
        ?.destroy();

      languageController
        ?.destroy();

      cleanups.forEach(
        cleanup => cleanup()
      );

      errorPresenter.destroy();

      delete app.dataset.xsusInitialized;

      throw error;
    }
  }

  initialize();

  /* ==========================================
     PUBLIC API
  ========================================== */

  return Object.freeze({
    version: XSUS_APP_VERSION,

    getLanguage() {
      return languageController
        ?.getLanguage();
    },

    setLanguage(language) {
      return (
        languageController
          ?.setLanguage(language) ||
        false
      );
    },

    newChat() {
      return chatController
        ?.newConversation();
    },

    sendMessage() {
      return chatController
        ?.sendMessage();
    },

    getConversations() {
      return (
        chatController
          ?.getConversations() ||
        []
      );
    },

    navigate(section) {
      return (
        navigationController
          ?.navigate(section) ||
        false
      );
    },

    getAttachments() {
      return (
        plusMenuController
          ?.getFiles() ||
        []
      );
    },

    isAIConnected() {
      return Boolean(adapter);
    },

    isPrivateHistoryEnabled() {
      return Boolean(
        enablePrivateHistory
      );
    },

    getPrivateHistoryStatus() {
      return (
        app.dataset.historyStatus ||
        "unknown"
      );
    },

    getAuthenticatedUserId() {
      return privateHistorySession
        ?.getCurrentUserId() ||
        null;
    },

    refreshPrivateHistory(options) {
      if (!privateHistorySession) {
        return Promise.resolve(false);
      }

      return privateHistorySession
        .refresh(options);
    },

    destroy() {
      if (destroyed) return;

      destroyed = true;

      /*
       * Destroy the authentication
       * session before destroying chat.
       */
      privateHistorySession
        ?.destroy();
      privateChatPersistence?.destroy();
      privateWriteService?.destroy();

      cleanups.forEach(
        cleanup => cleanup()
      );

      navigationController
        ?.destroy();

      chatController
        ?.destroy();

      plusMenuController
        ?.destroy();

      languageController
        ?.destroy();

      errorPresenter.destroy();

      delete app.dataset.xsusInitialized;
      delete app.dataset.historyStatus;
      delete app.dataset.authenticated;
    }
  });
}

/* ============================================
   BROWSER BOOTSTRAP
============================================ */

function bootXSUSAI() {
  const app =
    document.querySelector(
      SELECTORS.app
    );

  if (!app) return;

  if (
    app.dataset.xsusInitialized ===
    "true"
  ) {
    return;
  }

  try {
    const instance =
      createXSUSAIApp({
        aiAdapter:
          createXSUSCoreAdapter({
            getLanguage: () => {
              const select =
                document.querySelector(
                  "[data-xsus-language-select]"
                );

              return (
                select?.value ||
                "sq"
              );
            }
          }),

        enablePrivateHistory: true,
        enablePrivateWrites: false
      });

    window.XSUSAI =
      instance;

  } catch (error) {
    console.error(
      "[XSUS AI V3] Initialization failed:",
      error
    );
  }
}

/* ============================================
   DOM READY
============================================ */

if (
  typeof document !== "undefined"
) {
  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      bootXSUSAI,
      {
        once: true
      }
    );
  } else {
    bootXSUSAI();
  }
}
