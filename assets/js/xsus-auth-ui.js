
/**
 * XSUS Studio — Global Authentication UI
 * Version: 1.0.0
 *
 * Shared across XSUS Studio and all six products.
 * Uses the existing Supabase client.
 *
 * This module displays authentication status.
 * It does not authorize API requests or persist chats.
 */

import {
  supabase
} from "../../services/supabase-client.js";

const LABELS = Object.freeze({
  en: {
    login: "Login",
    signup: "Sign Up",
    account: "My Account"
  },
  sq: {
    login: "Hyr",
    signup: "Regjistrohu",
    account: "Llogaria ime"
  },
  fr: {
    login: "Connexion",
    signup: "Inscription",
    account: "Mon compte"
  }
});

const STYLE_ID = "xsus-global-auth-style";

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;

  style.textContent = `
    [hidden] {
      display: none !important;
    }

    .xsus-global-auth {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .xsus-global-auth a {
      text-decoration: none;
      white-space: nowrap;
    }

    .xsus-global-auth-account {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 12px;
      border: 1px solid rgba(32,232,255,.35);
      border-radius: 10px;
      background: rgba(32,232,255,.08);
      color: #e9faff;
      font-size: 13px;
      font-weight: 600;
    }

    .xsus-global-auth-dot {
      width: 8px;
      height: 8px;
      flex: 0 0 8px;
      border-radius: 50%;
      background: #25d695;
      box-shadow: 0 0 8px rgba(37,214,149,.5);
    }

    .xsus-global-auth-account:focus-visible,
    .xsus-global-auth a:focus-visible {
      outline: 2px solid #20e8ff;
      outline-offset: 3px;
    }
  `;

  document.head.appendChild(style);
}

function getLanguage() {
  const select = document.querySelector(
    "#language, [data-xsus-language-select]"
  );

  const selected = select?.value?.toLowerCase();

  if (LABELS[selected]) return selected;

  try {
    const saved = localStorage.getItem("xsus_language");
    if (LABELS[saved]) return saved;
  } catch {
    // Local storage may be unavailable.
  }

  return "en";
}

function findContainer() {
  return document.querySelector(
    ".xsus-ai-header-actions, .header .actions"
  );
}

function getOrCreateElements() {
  const container = findContainer();
  if (!container) return null;

  // The Studio homepage already has these elements.
  const existingLogin =
    document.getElementById("xsusLogin");

  const existingSignup =
    document.getElementById("xsusSignup");

  const existingAccount =
    document.getElementById("xsusAccount");

  if (existingLogin && existingSignup && existingAccount) {
    return {
      login: existingLogin,
      signup: existingSignup,
      account: existingAccount,
      accountText:
        document.getElementById("xsusAccountText")
    };
  }

  // Other XSUS pages receive the same controls.
  const wrapper = document.createElement("div");
  wrapper.className = "xsus-global-auth";

  wrapper.innerHTML = `
    <a
      href="auth.html"
      id="xsusLogin"
      hidden
    >Login</a>

    <a
      href="auth.html"
      id="xsusSignup"
      class="signup"
      hidden
    >Sign Up</a>

    <a
      href="auth.html"
      id="xsusAccount"
      class="xsus-global-auth-account"
      hidden
    >
      <span
        class="xsus-global-auth-dot"
        aria-hidden="true"
      ></span>
      <span id="xsusAccountText">
        My Account
      </span>
    </a>
  `;

  const menu = container.querySelector(
    ".menu-toggle, .xsus-ai-menu-toggle"
  );

  if (menu) {
    container.insertBefore(wrapper, menu);
  } else {
    container.appendChild(wrapper);
  }

  return {
    login: wrapper.querySelector("#xsusLogin"),
    signup: wrapper.querySelector("#xsusSignup"),
    account: wrapper.querySelector("#xsusAccount"),
    accountText:
      wrapper.querySelector("#xsusAccountText")
  };
}

function updateLabels(elements) {
  const labels = LABELS[getLanguage()] || LABELS.en;

  elements.login.textContent = labels.login;
  elements.signup.textContent = labels.signup;

  if (elements.accountText) {
    elements.accountText.textContent = labels.account;
  }

  elements.account.setAttribute(
    "aria-label",
    labels.account
  );
}

function renderAuth(elements, session) {
  const signedIn = Boolean(session?.user);

  elements.login.hidden = signedIn;
  elements.signup.hidden = signedIn;
  elements.account.hidden = !signedIn;

  updateLabels(elements);

  document.documentElement.dataset.xsusAuthenticated =
    String(signedIn);
}

export function initializeXSUSAuthUI() {
  installStyles();

  const elements = getOrCreateElements();

  if (!elements) {
    console.warn(
      "XSUS Auth UI: header actions container not found."
    );
    return;
  }

  // Avoid showing an incorrect status while loading.
  elements.login.hidden = true;
  elements.signup.hidden = true;
  elements.account.hidden = true;

  const update = session => {
    renderAuth(elements, session);
  };

  supabase.auth.onAuthStateChange(
    (_event, session) => {
      update(session);
    }
  );

  async function refresh() {
    try {
      const { data, error } =
        await supabase.auth.getSession();

      if (error) throw error;

      update(data.session);
    } catch (error) {
      console.error("XSUS Auth UI:", error);
      update(null);
    }
  }

  const languageSelect = document.querySelector(
    "#language, [data-xsus-language-select]"
  );

  languageSelect?.addEventListener(
    "change",
    () => updateLabels(elements)
  );

  window.addEventListener("pageshow", refresh);

  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) refresh();
    }
  );

  refresh();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeXSUSAuthUI,
    { once: true }
  );
} else {
  initializeXSUSAuthUI();
}
