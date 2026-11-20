export const boardMarkup = `<div class="task-board">
  <label>Task name <input id="task-name" maxlength="200" autocomplete="off" required></label>
  <label>Due date <input id="task-date" type="date"></label>
  <button id="add-task" type="button">Add task</button>
  <p id="task-count" role="status">0 tasks</p>
  <ul id="tasks"></ul>
  <button id="save-board" type="button">Save HTML with tasks</button>
  <small id="save-status" role="status"></small>
</div>`;

export const boardStyles = `.task-board{display:grid;gap:.7rem;margin-top:1rem}
.task-board label{display:grid;gap:.2rem}.task-board input,.task-board button{font:inherit;padding:.45rem}
.task-board button{justify-self:start;background:#14559b;color:white;border:0;border-radius:.35rem;padding:.5rem 1rem}
.task-board ul{list-style:none;padding:0;margin:0}.task-board li{border-top:1px solid #d3dce5;padding:.6rem 0}
.task-board li label{display:flex;align-items:center;gap:.5rem}.task-board li input:checked+span{text-decoration:line-through}
.task-board time{display:block;margin-left:2rem}`;

function runTaskBoard() {
  const name = document.getElementById('task-name');
  const date = document.getElementById('task-date');
  const tasks = document.getElementById('tasks');
  const count = document.getElementById('task-count');

  function updateCount() {
    const total = tasks.children.length;
    const done = tasks.querySelectorAll('input:checked').length;
    count.textContent = done + ' / ' + total + ' completed';
  }

  const board = document.documentElement;
  const prefix = 'xsus:task-board:v1:' + board.dataset.board + ':';
  const status = document.getElementById('save-status');
  const records = new Map();
  const snapshot = () => Array.from(records.values());
  const embedded = window.parent !== window;

  function storeTask(task) {
    if (embedded) {
      window.parent.postMessage({type:'xsus-board-state', board:board.dataset.board, tasks:snapshot()}, '*');
      return;
    }
    try {
      localStorage.setItem(prefix + task.id, JSON.stringify(task));
      status.textContent = 'Saved in this browser.';
    } catch {
      status.textContent = 'Use Save HTML with tasks to keep a copy on this device.';
    }
  }

  function renderTask(task) {
    if (!task || typeof task.id !== 'string' || typeof task.name !== 'string' ||
        typeof task.date !== 'string' || typeof task.done !== 'boolean') return;
    records.set(task.id, task);
    const item = document.createElement('li');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const title = document.createElement('span');
    title.textContent = task.name;
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => {
      task.done = checkbox.checked;
      storeTask(task);
    });
    label.append(checkbox, title);
    item.append(label);
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit task';
    const due = document.createElement('time');
    function display() {
      title.textContent = task.name;
      edit.setAttribute('aria-label', 'Edit task: ' + task.name);
      due.hidden = !task.date;
      due.dateTime = task.date;
      due.textContent = task.date ? 'Due ' + task.date : '';
    }
    item.append(due, edit);
    display();
    edit.addEventListener('click', () => {
      edit.hidden = true;
      const panel = document.createElement('div');
      function field(caption, type, value) {
        const label = document.createElement('label');
        label.textContent = caption;
        const input = document.createElement('input');
        input.type = type;
        input.value = value;
        label.append(input);
        panel.append(label);
        return input;
      }
      const editedName = field('Task name', 'text', task.name);
      editedName.required = true;
      editedName.maxLength = 200;
      const editedDate = field('Due date', 'date', task.date);
      function close() {
        panel.remove();
        edit.hidden = false;
        edit.focus();
      }
      function save() {
        editedName.value = editedName.value.trim();
        if (!editedName.reportValidity() || !editedDate.reportValidity()) return;
        task.name = editedName.value;
        task.date = editedDate.value;
        display();
        storeTask(task);
        close();
      }
      for (const [caption, action] of [['Save changes', save], ['Cancel', close]]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = caption;
        button.addEventListener('click', action);
        panel.append(button);
      }
      panel.addEventListener('keydown', event => {
        if (event.key === 'Escape') close();
        if (event.key === 'Enter' && event.target === editedName && !event.isComposing) save();
      });
      item.append(panel);
      editedName.focus();
    });
    tasks.append(item);
  }

  function addTask() {
    name.value = name.value.trim();
    if (!name.reportValidity() || !date.reportValidity()) return;
    const task = {id:crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random(), name:name.value, date:date.value, done:false};
    renderTask(task);
    storeTask(task);
    updateCount();
    name.value = '';
    date.value = '';
    name.focus();
  }

  const restored = new Map();
  try {
    for (const task of JSON.parse(decodeURIComponent(board.dataset.tasks || '%5B%5D'))) restored.set(task.id, task);
  } catch {}
  if (!embedded) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          try {
            const task = JSON.parse(localStorage.getItem(key));
            restored.set(task.id, task);
          } catch {}
        }
      }
    } catch {
      status.textContent = 'Use Save HTML with tasks to keep a copy on this device.';
    }
  } else {
    status.textContent = 'Use Save HTML with tasks to reopen this board later.';
  }
  restored.forEach(renderTask);
  if (records.size) updateCount();

  document.getElementById('save-board').addEventListener('click', () => {
    const copy = board.cloneNode(true);
    copy.dataset.tasks = encodeURIComponent(JSON.stringify(snapshot()));
    copy.dataset.board = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random();
    copy.querySelector('#tasks').replaceChildren();
    copy.querySelector('#save-status').textContent = '';
    const file = new Blob(['<!doctype html>\n', copy.outerHTML], {type:'text/html;charset=utf-8'});
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'xsus-task-board.html';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  });

  document.getElementById('add-task').addEventListener('click', addTask);
  name.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing) addTask();
  });
  tasks.addEventListener('change', updateCount);
}

export const boardScript = '(' + runTaskBoard.toString() + ')();';
