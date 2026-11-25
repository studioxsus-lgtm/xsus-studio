export function taskPagesPreview() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Task Manager</title><link rel="stylesheet" href="./styles.css"></head><body>
<main>
<section id="home" aria-labelledby="home-title"><h1 id="home-title">Task Manager</h1><article><h2>Task overview</h2><p id="summary"></p><progress id="progress" max="1" value="0" aria-label="Completed tasks"></progress></article><button type="button" data-new>New task</button></section>
<section id="tasks" hidden aria-labelledby="tasks-title"><h1 id="tasks-title">Tasks</h1><label>Search tasks<input type="search" id="search"></label><div class="actions"><label class="filter"><input type="checkbox" id="pending"> Pending only</label><button type="button" data-new>New task</button></div><ul id="records"></ul><p id="empty"></p></section>
<section id="editor" hidden aria-labelledby="editor-title"><h1 id="editor-title">New task</h1><form id="entry-form"><label>Task title<input name="title" required maxlength="200"></label><div class="actions"><button type="submit">Save task</button><button type="button" class="secondary" id="cancel">Cancel</button></div></form></section>
<nav aria-label="Pages"><button data-page="home">Home</button><button data-page="tasks">Tasks</button></nav></main><script src="./main.js"></script></body></html>`;
  const css = `:root{font-family:Inter,system-ui,sans-serif;color:#172439;background:#f1f4f8;color-scheme:light}*{box-sizing:border-box}body{margin:0}main{max-width:46rem;margin:auto;padding:clamp(1.2rem,5vw,3rem) 1.25rem 7rem}h1{font-size:clamp(2.3rem,8vw,4rem);letter-spacing:-.05em;line-height:1.05}h2{font-size:1.4rem;margin-top:0}article,form,li{background:white;border-radius:1.3rem;padding:1.3rem;border:1px solid #d3dee6}article{background:#d7edeb;color:#093f45;margin-bottom:1.5rem}progress{width:100%;accent-color:#116865}label{display:grid;gap:.45rem;font-weight:600}input:not([type=checkbox]){padding:.85rem;border:1px solid #81959e;border-radius:.75rem;width:100%;font:inherit}button{min-height:44px;border:0;border-radius:1.5rem;font:inherit;font-weight:600;padding:.6rem 1.1rem;background:#105f62;color:white;cursor:pointer}.secondary,nav button,li button{background:#e7eff0;color:#19484a}nav{position:fixed;bottom:max(.8rem,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;gap:.5rem;background:white;border:1px solid #cddbdc;border-radius:3rem;padding:.4rem;box-shadow:0 3px 18px #20334020}nav button[aria-current=page]{background:#105f62;color:white}.actions,li{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}.actions{margin:1rem 0}.filter{display:flex;align-items:center;min-height:44px}ul{list-style:none;padding:0}li{margin:.6rem 0}li label{display:flex;align-items:center;flex:1;overflow-wrap:anywhere;min-width:7rem}[hidden]{display:none!important}:focus-visible{outline:3px solid #bd6900;outline-offset:2px}`;
  return [{path:"index.html",content:html},{path:"styles.css",content:css},{path:"main.js",content:"("+runTaskPages.toString()+")();"}];
}

function runTaskPages() {
  const get = id => document.getElementById(id);
  const form = get("entry-form"), title = form.elements.title;
  let tasks = [], page = "home", origin = "home", editing = null;
  const storageKey = "xsus-task-pages-v1:" + location.pathname;
  try {
    const data = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(data)) tasks = data.filter(task => task && typeof task.title === "string" && typeof task.done === "boolean");
  } catch { /* The sandboxed studio preview can run without local storage. */ }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(tasks)); } catch { /* Keep the current preview usable. */ }
    render();
  }
  function show(next) {
    page = next;
    for (const id of ["home","tasks","editor"]) get(id).hidden = id !== page;
    document.querySelector("nav").hidden = page === "editor";
    document.querySelectorAll("[data-page]").forEach(b => {
      if (b.dataset.page === page) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current");
    });
    const heading = get(page).querySelector("h1");
    heading.tabIndex = -1;
    heading.focus();
  }
  function edit(task) {
    editing = task;
    origin = page;
    get("editor-title").textContent = task ? "Edit task" : "New task";
    title.value = task?.title || "";
    show("editor");
    title.focus();
  }
  function render() {
    const completed = tasks.filter(task => task.done).length;
    get("summary").textContent = completed + " of " + tasks.length + " completed";
    get("progress").value = tasks.length ? completed / tasks.length : 0;
    const list = get("records");
    list.replaceChildren();
    for (const task of tasks) {
      if ((get("pending").checked && task.done) || !task.title.toLowerCase().includes(get("search").value.trim().toLowerCase())) continue;
      const li = document.createElement("li"), label = document.createElement("label"), check = document.createElement("input");
      check.type = "checkbox"; check.checked = task.done;
      check.onchange = () => { task.done = check.checked; save(); };
      label.append(check,document.createTextNode(task.title)); li.append(label);
      for (const action of ["Edit","Delete"]) {
        const b = document.createElement("button"); b.type = "button"; b.textContent = action;
        b.onclick = () => { if (action === "Edit") edit(task); else { tasks = tasks.filter(item => item !== task); save(); } };
        li.append(b);
      }
      list.append(li);
    }
    get("empty").textContent = list.children.length ? "" : tasks.length ? "No matching tasks." : "No tasks yet.";
  }
  document.querySelectorAll("[data-new]").forEach(b => b.onclick = () => edit(null));
  document.querySelectorAll("[data-page]").forEach(b => b.onclick = () => show(b.dataset.page));
  get("cancel").onclick = () => show(origin);
  get("search").oninput = get("pending").onchange = render;
  form.onsubmit = event => {
    event.preventDefault();
    if (!title.value.trim()) return;
    if (editing) editing.title = title.value.trim();
    else tasks.push({title:title.value.trim(),done:false});
    save(); show("tasks");
  };
  render(); show("home");
}
