
/**
 * XSUS AI V3 — Plus Menu Controller
 * Version: 3.0.0
 *
 * Camera, gallery, documents and tool selection.
 * Independent UI module.
 *
 * Voice is intentionally excluded.
 */

export const PLUS_MENU_VERSION = "3.0.0";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const FILE_ACCEPT =
  "image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

export const PLUS_TOOLS = Object.freeze([
  {
    id: "camera",
    label: "Kamera",
    description: "Bëj një fotografi",
    icon: "camera",
    group: "attachments",
    available: true
  },
  {
    id: "gallery",
    label: "Galeria",
    description: "Zgjidh fotografi",
    icon: "image",
    group: "attachments",
    available: true
  },
  {
    id: "documents",
    label: "Dokumente / PDF",
    description: "Ngarko skedarë",
    icon: "file-up",
    group: "attachments",
    available: true
  },
  {
    id: "image",
    label: "Image Studio",
    description: "Gjenerim dhe redaktim imazhesh",
    icon: "images",
    group: "creative",
    available: false
  },
  {
    id: "video",
    label: "Video Studio",
    description: "Krijim videosh",
    icon: "video",
    group: "creative",
    available: false
  },
  {
    id: "pdf",
    label: "PDF Studio",
    description: "Krijim dhe analizë dokumentesh",
    icon: "file-text",
    group: "creative",
    available: false
  },
  {
    id: "research",
    label: "Deep Research",
    description: "Kërkim i avancuar",
    icon: "search",
    group: "intelligence",
    available: false
  },
  {
    id: "code",
    label: "Code Studio",
    description: "Programim dhe analizë kodi",
    icon: "code-2",
    group: "intelligence",
    available: false
  },
  {
    id: "data",
    label: "Data Analysis",
    description: "Analizë të dhënash",
    icon: "chart-no-axes-combined",
    group: "intelligence",
    available: false
  },
  {
    id: "ecosystem",
    label: "XSUS Ecosystem",
    description: "XSUS App, Web, Game, Logo, Domain",
    icon: "network",
    group: "ecosystem",
    available: false
  }
]);

const GROUPS = Object.freeze([
  ["attachments", "Skedarë dhe kamera"],
  ["creative", "Creative Studio"],
  ["intelligence", "Intelligence"],
  ["ecosystem", "XSUS Ecosystem"]
]);

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createPlusMenu(options = {}) {
  const {
    button,
    menu,
    attachmentsContainer = null,
    onFilesChange = () => {},
    onToolSelect = () => {},
    onError = () => {}
  } = options;

  if (!(button instanceof HTMLElement)) {
    throw new TypeError(
      "XSUS Plus Menu: button element is required."
    );
  }

  if (!(menu instanceof HTMLElement)) {
    throw new TypeError(
      "XSUS Plus Menu: menu element is required."
    );
  }

  let destroyed = false;
  let attachments = [];
  let searchInput = null;

  const listeners = [];

  function listen(target, event, handler) {
    target.addEventListener(event, handler);

    listeners.push(() => {
      target.removeEventListener(event, handler);
    });
  }

  function reportError(message) {
    onError(message);
  }

  function emitFilesChange() {
    onFilesChange([...attachments]);
  }

  function setOpen(open) {
    if (destroyed) return;

    menu.hidden = !open;

    button.setAttribute(
      "aria-expanded",
      String(open)
    );

    if (open && searchInput) {
      searchInput.focus();
    }

    if (!open) {
      button.focus();
    }
  }

  function toggle() {
    setOpen(menu.hidden);
  }

  function clearFiles() {
    attachments = [];
    renderAttachments();
    emitFilesChange();
  }

  function removeFile(index) {
    if (index < 0 || index >= attachments.length) {
      return;
    }

    attachments.splice(index, 1);

    renderAttachments();
    emitFilesChange();
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []);

    if (!files.length) return;

    let changed = false;

    for (const file of files) {
      if (attachments.length >= MAX_FILES) {
        reportError(
          `Mund të ngarkosh maksimumi ${MAX_FILES} skedarë.`
        );
        break;
      }

      if (file.size > MAX_FILE_SIZE) {
        reportError(
          `${file.name} është më i madh se 20 MB.`
        );
        continue;
      }

      const duplicate = attachments.some(
        item =>
          item.name === file.name &&
          item.size === file.size &&
          item.lastModified === file.lastModified
      );

      if (duplicate) {
        continue;
      }

      attachments.push(file);
      changed = true;
    }

    if (changed) {
      renderAttachments();
      emitFilesChange();
    }
  }

  function renderAttachments() {
    if (!attachmentsContainer) return;

    attachmentsContainer.replaceChildren();

    attachments.forEach((file, index) => {
      const item = createElement(
        "div",
        "xsus-chat-attachment"
      );

      const name = createElement(
        "span",
        "xsus-chat-attachment-name",
        `${file.name} (${formatFileSize(file.size)})`
      );

      const remove = createElement(
        "button",
        "xsus-chat-attachment-remove",
        "×"
      );

      remove.type = "button";
      remove.setAttribute(
        "aria-label",
        `Hiq ${file.name}`
      );

      remove.addEventListener("click", () => {
        removeFile(index);
      });

      item.append(name, remove);
      attachmentsContainer.append(item);
    });
  }

  function createFileInput(accept, capture = null) {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = accept;
    input.hidden = true;

    if (capture) {
      input.setAttribute("capture", capture);
    }

    if (!capture) {
      input.multiple = true;
    }

    input.addEventListener("change", () => {
      addFiles(input.files);
      input.value = "";
    });

    document.body.append(input);

    return input;
  }

  const cameraInput = createFileInput(
    "image/*",
    "environment"
  );

  const galleryInput = createFileInput("image/*");

  const documentInput = createFileInput(FILE_ACCEPT);

  function selectTool(tool) {
    if (destroyed) return;

    if (tool.id === "camera") {
      cameraInput.click();
      setOpen(false);
      return;
    }

    if (tool.id === "gallery") {
      galleryInput.click();
      setOpen(false);
      return;
    }

    if (tool.id === "documents") {
      documentInput.click();
      setOpen(false);
      return;
    }

    if (!tool.available) {
      reportError(
        `${tool.label} nuk është lidhur ende me motorin përkatës.`
      );
      return;
    }

    onToolSelect(tool);
    setOpen(false);
  }

  function renderMenu(query = "") {
    const normalized = query
      .trim()
      .toLocaleLowerCase();

    const content = menu.querySelector(
      "[data-plus-content]"
    );

    if (!content) return;

    content.replaceChildren();

    for (const [groupId, groupLabel] of GROUPS) {
      const tools = PLUS_TOOLS.filter(tool => {
        const matchesGroup = tool.group === groupId;

        const searchable =
          `${tool.label} ${tool.description}`
            .toLocaleLowerCase();

        return (
          matchesGroup &&
          searchable.includes(normalized)
        );
      });

      if (!tools.length) continue;

      const group = createElement(
        "section",
        "xsus-plus-group"
      );

      const title = createElement(
        "h3",
        "xsus-plus-group-title",
        groupLabel
      );

      group.append(title);

      for (const tool of tools) {
        const item = createElement(
          "button",
          "xsus-plus-item"
        );

        item.type = "button";
        item.dataset.tool = tool.id;

        const icon = createElement(
          "span",
          "xsus-plus-item-icon"
        );

        icon.dataset.lucide = tool.icon;

        const contentBox = createElement(
          "span",
          "xsus-plus-item-content"
        );

        const name = createElement(
          "span",
          "xsus-plus-item-name",
          tool.label
        );

        const description = createElement(
          "span",
          "xsus-plus-item-description",
          tool.description
        );

        contentBox.append(name, description);
        item.append(icon, contentBox);

        if (!tool.available) {
          const status = createElement(
            "span",
            "xsus-plus-item-status",
            "Së shpejti"
          );

          item.append(status);
        }

        item.addEventListener("click", () => {
          selectTool(tool);
        });

        group.append(item);
      }

      content.append(group);
    }

    if (!content.children.length) {
      content.append(
        createElement(
          "p",
          "xsus-sidebar-empty",
          "Nuk u gjet asnjë mjet."
        )
      );
    }

    // Replace icon placeholders with Lucide SVGs.
    if (window.lucide?.createIcons) {
      window.lucide.createIcons({
        nodes: content.querySelectorAll(
          "[data-lucide]"
        )
      });
    }
  }

  function buildMenu() {
    menu.classList.add("xsus-plus-menu");
    menu.hidden = true;

    menu.replaceChildren();

    const header = createElement(
      "div",
      "xsus-plus-menu-header"
    );

    const title = createElement(
      "h2",
      "xsus-plus-menu-title",
      "XSUS AI Tools"
    );

    const close = createElement(
      "button",
      "xsus-plus-menu-close",
      "×"
    );

    close.type = "button";
    close.setAttribute(
      "aria-label",
      "Mbyll menunë"
    );

    header.append(title, close);

    searchInput = createElement(
      "input",
      "xsus-plus-search"
    );

    searchInput.type = "search";
    searchInput.placeholder = "Kërko një mjet...";
    searchInput.setAttribute(
      "aria-label",
      "Kërko mjetet"
    );

    const content = createElement("div");
    content.dataset.plusContent = "";

    menu.append(header, searchInput, content);

    listen(close, "click", () => setOpen(false));

    listen(searchInput, "input", () => {
      renderMenu(searchInput.value);
    });

    renderMenu();
  }

  buildMenu();

  if (!menu.id) {
    menu.id = "xsus-plus-menu";
  }

  button.setAttribute("aria-controls", menu.id);
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-haspopup", "true");

  listen(button, "click", toggle);

  listen(document, "pointerdown", event => {
    if (
      !menu.hidden &&
      !menu.contains(event.target) &&
      !button.contains(event.target)
    ) {
      setOpen(false);
    }
  });

  listen(document, "keydown", event => {
    if (
      event.key === "Escape" &&
      !menu.hidden
    ) {
      setOpen(false);
    }
  });

  return Object.freeze({
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle,
    addFiles,
    clearFiles,
    getFiles: () => [...attachments],

    destroy() {
      if (destroyed) return;

      destroyed = true;

      listeners.forEach(cleanup => cleanup());

      cameraInput.remove();
      galleryInput.remove();
      documentInput.remove();

      menu.hidden = true;
      attachments = [];
    }
  });
}
