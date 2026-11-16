/**
 * XSUS App — first real deterministic web build executor.
 * Generates runnable HTML/CSS/JS files, not just a manifest.
 * Restricted to a static web starter; no AI model or arbitrary code execution.
 * Call ONLY after Hyper dispatcher authorization. Persistence is mandatory.
 */
import { randomUUID } from "node:crypto";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const escapeHtml = s => s.replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[c]);
const safeJsString = s => JSON.stringify(s).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
export function createHyperWebBuildExecutor({ saveArtifact, createArtifactId = randomUUID,
  createRequestId = randomUUID } = {}) {
  if (typeof saveArtifact !== "function" ||
      typeof createArtifactId !== "function" ||
      typeof createRequestId !== "function")
    throw new TypeError("Trusted artifact persistence and ID providers are required.");

  return async function buildApplication({ userId, projectId, prompt, contractVersion } = {}) {
    if (!UUID.test(userId ?? "") || !UUID.test(projectId ?? "") ||
        contractVersion !== "1.0.0" ||
        typeof prompt !== "string" || !prompt.trim() || prompt.trim().length > 8000)
      throw new TypeError("Invalid authorized build context.");
    const artifactId = createArtifactId();
    const requestId = createRequestId();
    if (!UUID.test(artifactId ?? "") ||
        typeof requestId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(requestId))
      throw new Error("Invalid server-generated build identifiers.");

    const title = prompt.trim().slice(0, 100);
    const htmlTitle = escapeHtml(title);
    const files = Object.freeze([
      Object.freeze({
        path: "index.html",
        content: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'">
<title>${htmlTitle}</title><link rel="stylesheet" href="./styles.css"></head>
<body><main><h1>${htmlTitle}</h1><p>XSUS App static web starter</p>
<form id="item-form"><label for="item">New item</label><input id="item" maxlength="160" required>
<button type="submit">Add</button></form><ul id="items" aria-live="polite"></ul></main>
<script src="./app.js" defer></script></body></html>`
      }),
      Object.freeze({
        path: "styles.css",
        content: "body{font:16px system-ui,sans-serif;background:#0b1020;color:#f4f7ff;margin:0;padding:2rem}main{max-width:720px;margin:auto}input,button{font:inherit;padding:.7rem;margin:.4rem;border-radius:.5rem}button{cursor:pointer}li{margin:.6rem 0}"
      }),
      Object.freeze({
        path: "app.js",
        content: `"use strict";
const appTitle = ${safeJsString(title)};
const form = document.getElementById("item-form");
const input = document.getElementById("item");
const items = document.getElementById("items");
form.addEventListener("submit", event => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  const li = document.createElement("li");
  li.textContent = value;
  items.appendChild(li);
  form.reset();
  input.focus();
});`
      })
    ]);
    const saved = await saveArtifact(Object.freeze({
      userId, projectId, artifactId, requestId,
      platform: "web", format: "static-web-files", files
    }));
    if (saved !== true) throw new Error("Application build artifact persistence failed.");
    return Object.freeze({
      ok: true, contractVersion: "1.0.0", operation: "application.build",
      projectId, requestId, artifactId, status: "completed"
    });
  };
}
