
/**
 * XSUS AI V3 — Plus Menu Controller
 * Version: 3.1.0
 *
 * Camera, gallery, documents, tool selection,
 * image thumbnails and attachment previews.
 *
 * Independent UI module.
 * No AI Core or Hyper XSUS Core dependencies.
 *
 * Voice is intentionally excluded.
 */

export const PLUS_MENU_VERSION = "3.1.0";

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

function isImage(file) {
  return file.type.startsWith("image/");
}

function isPDF(file) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function getFileExtension(name) {
  const parts = name.split(".");

  return parts.length > 1
    ? parts.pop().toUpperCase()
    : "FILE";
}

function getFileIcon(file) {
  if (isPDF(file)) {
    return "file-text";
  }

  const extension = getFileExtension(file.name);

  if (["DOC", "DOCX", "TXT", "MD"].includes(extension)) {
    return "file-text";
  }

  if (["XLS", "XLSX", "CSV"].includes(extension)) {
    return "sheet";
  }

  if (["PPT", "PPTX"].includes(extension)) {
    return "presentation";
  }

  if (["JSON"].includes(extension)) {
    return "file-code";
  }

  return "file";
}

function refreshLucide(container) {
  if (
    typeof window !== "undefined" &&
    window.lucide?.createIcons
  ) {
    window.lucide.createIcons({
      nodes: container.querySelectorAll("[data-lucide]")
    });
  }
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
  const previewURLs = new Map();

  function listen(target, event, handler) {
    target.addEventListener(event, handler);

    listeners.push(() => {
      target.removeEventListener(event, handler);
    });
  }

  function reportError(message) {
    if (destroyed) return;

    onError(message);
  }

  function emitFilesChange() {
    if (destroyed) return;

    onFilesChange([...attachments]);
  }

  function releasePreview(file) {
    const url = previewURLs.get(file);

    if (url) {
      URL.revokeObjectURL(url);
      previewURLs.delete(file);
    }
  }

  function releaseAllPreviews() {
    for (const url of previewURLs.values()) {
      URL.revokeObjectURL(url);
    }

    previewURLs.clear();
  }

  function getPreviewURL(file) {
    if (!isImage(file)) {
      return null;
    }

    if (!previewURLs.has(file)) {
      previewURLs.set(
        file,
        URL.createObjectURL(file)
      );
    }

    return previewURLs.get(file);
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

    if (!open && open !== undefined) {
      button.focus();
    }
  }

  function toggle() {
    setOpen(menu.hidden);
  }

  function clearFiles() {
    if (destroyed) return;

    attachments = [];

    releaseAllPreviews();
    renderAttachments();
    emitFilesChange();
  }

  function removeFile(index) {
    if (destroyed) return;

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= attachments.length
    ) {
      return;
    }

    const [removed] = attachments.splice(index, 1);

    releasePreview(removed);

    renderAttachments();
    emitFilesChange();
  }

  function addFiles(fileList) {
    if (destroyed) return;

    const files = Array.from(fileList || []);

    if (!files.length) return;

    let changed = false;

    for (const file of files) {
      if (!(file instanceof File)) {
        continue;
      }

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

  function createImagePreview(file) {
    const wrapper = createElement(
      "div",
      "xsus-attachment-preview"
    );

    const image = createElement(
      "img",
      "xsus-attachment-thumbnail"
    );

    image.src = getPreviewURL(file);
    image.alt = `Pamje paraprake: ${file.name}`;
    image.loading = "lazy";
    image.decoding = "async";

    image.style.width = "48px";
    image.style.height = "48px";
    image.style.objectFit = "cover";
    image.style.borderRadius = "9px";
    image.style.display = "block";
    image.style.flexShrink = "0";

    image.addEventListener("error", () => {
      if (destroyed) return;

      image.replaceWith(
        createDocumentPreview(file)
      );
    }, { once: true });

    wrapper.append(image);

    return wrapper;
  }

  function createDocumentPreview(file) {
    const wrapper = createElement(
      "div",
      "xsus-attachment-preview xsus-attachment-document"
    );

    const icon = createElement(
      "span",
      "xsus-attachment-document-icon"
    );

    icon.dataset.lucide = getFileIcon(file);

    const extension = createElement(
      "span",
      "xsus-attachment-extension",
      getFileExtension(file.name)
    );

    wrapper.style.width = "48px";
    wrapper.style.height = "48px";
    wrapper.style.borderRadius = "9px";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.gap = "2px";
    wrapper.style.flexShrink = "0";
    wrapper.style.background = "rgba(66,133,255,0.12)";
    wrapper.style.border =
      "1px solid rgba(66,133,255,0.25)";
    wrapper.style.color = "#7ddcff";

    extension.style.fontSize = "9px";
    extension.style.fontWeight = "700";
    extension.style.maxWidth = "44px";
    extension.style.overflow = "hidden";
    extension.style.textOverflow = "ellipsis";

    wrapper.append(icon, extension);

    return wrapper;
  }

  function renderAttachments() {
    if (!attachmentsContainer || destroyed) {
      return;
    }

    attachmentsContainer.replaceChildren();

    attachments.forEach((file, index) => {
      const item = createElement(
        "div",
        "xsus-chat-attachment"
      );

      item.dataset.fileIndex = String(index);

      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "9px";
      item.style.maxWidth = "100%";

      const preview = isImage(file)
        ? createImagePreview(file)
        : createDocumentPreview(file);

      const info = createElement(
        "div",
        "xsus-attachment-info"
      );

      info.style.display = "flex";
      info.style.flexDirection = "column";
      info.style.minWidth = "0";
      info.style.flex = "1";

      const name = createElement(
        "span",
        "xsus-chat-attachment-name",
        file.name
      );

      name.title = file.name;
      name.style.display = "block";
      name.style.overflow = "hidden";
      name.style.textOverflow = "ellipsis";
      name.style.whiteSpace = "nowrap";

      const size = createElement(
        "span",
        "xsus-attachment-size",
        formatFileSize(file.size)
      );

      size.style.fontSize = "11px";
      size.style.opacity = "0.65";

      info.append(name, size);

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

      remove.title = `Hiq ${file.name}`;

      remove.style.flexShrink = "0";

      remove.addEventListener("click", () => {
        removeFile(index);
      });

      item.append(preview, info, remove);
      attachmentsContainer.append(item);
    });

    refreshLucide(attachmentsContainer);
  }

  function createFileInput(accept, capture = null) {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = accept;
    input.hidden = true;

    if (capture) {
      input.setAttribute("capture", capture);
    } else {
      input.multiple = true;
    }

    input.addEventListener("change", () => {
      if (destroyed) return;

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
    if (destroyed) return;

    const normalized = String(query)
      .trim()
      .toLocaleLowerCase();

    const content = menu.querySelector(
      "[data-plus-content]"
    );

    if (!content) return;

    content.replaceChildren();

    for (const [groupId, groupLabel] of GROUPS) {
      const tools = PLUS_TOOLS.filter(tool => {
        const searchable =
          `${tool.label} ${tool.description}`
            .toLocaleLowerCase();

        return (
          tool.group === groupId &&
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

    refreshLucide(content);
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

      listeners.forEach(cleanup => cleanup());

      releaseAllPreviews();

      cameraInput.remove();
      galleryInput.remove();
      documentInput.remove();

      attachments = [];

      menu.hidden = true;
      menu.replaceChildren();

      if (attachmentsContainer) {
        attachmentsContainer.replaceChildren();
      }

      destroyed = true;
    }
  });
}
