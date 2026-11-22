// Offline, generated task manager. No network access, dynamic evaluation or remote scripts.
export const taskManagerMarkup = `<section id="task-workspace"><h2>Task Manager</h2>
<form id="task-form"><label>Task name <input id="task-name" required maxlength="200"></label>
<label>Due date <input id="task-date" type="date"></label>
<button type="submit">Add task</button></form>
<p id="task-count" role="status">0 tasks</p><ul id="tasks"></ul>
<button id="export-tasks" type="button">Export tasks (JSON)</button></section>`;
export const taskManagerCss = `#task-form{display:flex;flex-wrap:wrap;align-items:end;gap:.7rem}
#task-form label{display:grid;gap:.25rem}input,button{font:inherit;padding:.45rem}
button{cursor:pointer;border:1px solid #9bb4cf;border-radius:.4rem;background:#eaf2ff}
#tasks{list-style:none;padding:0}#tasks li{display:flex;align-items:center;flex-wrap:wrap;gap:.6rem;padding:.65rem;border-bottom:1px solid #d3dce5}
#tasks li.done .task-label{text-decoration:line-through;color:#637184}`;
export const taskManagerJs = `
const storageKey = 'xsus-task-manager:' + location.pathname;
let tasks = [];
try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(saved)) tasks = saved.filter(t => t && typeof t.name === 'string' && typeof t.done === 'boolean').slice(0, 500);
} catch {}
const taskList = document.getElementById('tasks');
const taskForm = document.getElementById('task-form');
function persistTasks() {
  try { localStorage.setItem(storageKey, JSON.stringify(tasks)); }
  catch { document.getElementById('task-count').textContent = 'Storage unavailable; export your tasks.'; }
}
function renderTasks() {
  taskList.replaceChildren();
  tasks.forEach(task => {
    const li = document.createElement('li'); if (task.done) li.className = 'done';
    const done = document.createElement('input'); done.type = 'checkbox'; done.checked = task.done;
    done.setAttribute('aria-label','Mark task complete');
    done.addEventListener('change', () => { task.done = done.checked; persistTasks(); renderTasks(); });
    const label = document.createElement('span'); label.className = 'task-label'; label.textContent = task.name;
    const due = document.createElement('time'); due.textContent = task.due || '';
    const edit = document.createElement('button'); edit.textContent = 'Edit';
    edit.addEventListener('click', () => { const next = prompt('Edit task',task.name);
      if (next !== null && next.trim()) { task.name = next.trim().slice(0,200); persistTasks(); renderTasks(); } });
    const remove = document.createElement('button'); remove.textContent = 'Delete';
    remove.addEventListener('click', () => { if (!confirm('Delete this task?')) return;
      tasks = tasks.filter(t => t.id !== task.id); persistTasks(); renderTasks(); });
    li.append(done,label,due,edit,remove); taskList.append(li);
  });
  document.getElementById('task-count').textContent =
    tasks.filter(t => t.done).length + ' / ' + tasks.length + ' completed';
}
taskForm.addEventListener('submit', event => { event.preventDefault();
  const name = document.getElementById('task-name').value.trim(); if (!name || tasks.length >= 500) return;
  tasks.push({ id: crypto.randomUUID(), name: name.slice(0,200),
    due: document.getElementById('task-date').value, done:false });
  taskForm.reset(); persistTasks(); renderTasks();
});
document.getElementById('export-tasks').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(tasks,null,2)],{type:'application/json'}));
  const a = document.createElement('a'); a.href=url; a.download='xsus-tasks.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url),30000);
});
renderTasks();
`;
