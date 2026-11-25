// @vitest-environment jsdom
import {afterEach, describe, expect, it} from "vitest";
import {generateWorkerStaticPreview} from "../../services/src/build-worker/static-preview-build.js";
import {generateAndroidGradleProject} from "../../services/src/build-worker/android-gradle-generator.js";

afterEach(() => { localStorage.clear(); document.body.replaceChildren(); });

describe("multi-page tasks", () => {
  it("creates, edits, completes, reloads and deletes a task through the generated pages", () => {
    const {files} = generateWorkerStaticPreview({name:"[XSUS tasks search pages] Task manager"});
    const file = path => files.find(item => item.path === path).content;
    const open = () => {
      document.body.innerHTML = new DOMParser().parseFromString(file("index.html"),"text/html").body.innerHTML;
      new Function(file("main.js"))();
    };
    const el = selector => document.querySelector(selector);
    open();
    el("#home [data-new]").click();
    expect(el("#editor").hidden).toBe(false);
    el("[name=title]").value = "First";
    el("button[type=submit]").click();
    expect(el("#tasks").hidden).toBe(false);
    el("#records button").click();
    el("[name=title]").value = "Updated";
    el("button[type=submit]").click();
    el("#records input").click();
    el("[data-page=home]").click();
    expect(el("#summary").textContent).toBe("1 of 1 completed");
    open();
    expect(el("#summary").textContent).toBe("1 of 1 completed");
    el("[data-page=tasks]").click();
    expect(el("#records").textContent).toContain("Updated");
    el("#records button:last-child").click();
    expect(el("#empty").textContent).toBe("No tasks yet.");
  });

  it("generates the three native destinations only for bottom navigation", () => {
    const screen = navigation => generateAndroidGradleProject({applicationId:"com.xsus.tasks",displayName:"XSUS Tasks"},{navigation})
      .find(file => file.path.endsWith("/AppScreen.kt")).content;
    const pages = screen("bottom_bar");
    for (const fragment of ['"Home" ->','"Tasks" ->','"Editor" ->',"store.save(updated)","BackHandler("]) expect(pages).toContain(fragment);
    expect(screen("single_screen")).not.toContain("BackHandler(");
  });
});
