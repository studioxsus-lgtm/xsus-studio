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
  const assignee = document.getElementById('task-assignee');
  const tasks = document.getElementById('tasks');
  const count = document.getElementById('task-count');

  const filter = document.getElementById('member-filter');

  function updateCount() {
    if (filter && filter.value) {
      const visible = Array.from(tasks.children).filter(row => !row.hidden);
      const done = visible.filter(row => row.querySelector('input').checked).length;
      count.textContent = visible.length ? done + ' / ' + visible.length + ' completed' : 'No matching tasks.';
      return;
    }
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

  const headings = Array.from(document.querySelectorAll('section[id^="screen-"] > h2'));
  const overviewHeading = headings.find(heading => heading.textContent.trim().toLowerCase() === 'projects overview');
  const overview = document.createElement('div');
  if (overviewHeading) {
    overview.id = 'project-summary';
    overviewHeading.after(overview);
  }

  function localDay(now) {
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + month + '-' + day;
  }
  let today = localDay(new Date());
  function deadlineStatus(task) {
    if (task.done || !task.date) return '';
    if (task.date === today) return ' — Due today';
    return task.date < today ? ' — Overdue' : '';
  }
  function showDueDate(node, task) {
    node.textContent = task.date ? 'Due ' + task.date + deadlineStatus(task) : '';
  }

  function updateOverview() {
    if (!overviewHeading) return;
    let completed = 0;
    let earliest = '';
    for (const task of records.values()) {
      if (task.done) completed++;
      else if (task.date && (!earliest || task.date < earliest)) earliest = task.date;
    }
    const totals = document.createElement('p');
    totals.textContent = 'Open: ' + (records.size - completed) + ' · Completed: ' + completed;
    const deadline = document.createElement('p');
    deadline.textContent = 'Earliest open deadline: ' + (earliest || 'None');
    overview.replaceChildren(totals, deadline);
  }

  const calendarHeading = headings.find(heading => heading.textContent.trim().toLowerCase() === 'deadline calendar');
  const agenda = document.createElement('div');
  if (calendarHeading) {
    agenda.id = 'deadline-agenda';
    calendarHeading.after(agenda);
  }

  function updateCalendar() {
    if (!calendarHeading) return;
    const scheduled = snapshot().filter(task => task.date)
      .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
    agenda.replaceChildren();
    if (!scheduled.length) {
      agenda.textContent = 'No tasks with a due date.';
      return;
    }
    let lastDate;
    let list;
    for (const task of scheduled) {
      if (task.date !== lastDate) {
        const heading = document.createElement('h3');
        const day = document.createElement('time');
        day.dateTime = task.date;
        day.textContent = task.date;
        heading.append(day);
        list = document.createElement('ul');
        agenda.append(heading, list);
        lastDate = task.date;
      }
      const entry = document.createElement('li');
      entry.textContent = task.name + (task.done ? ' — Completed' : deadlineStatus(task));
      list.append(entry);
    }
  }

  function updateFilterOptions() {
    if (!filter) return;
    const selected = filter.value;
    const names = new Set(snapshot().map(task => task.assignee).filter(Boolean));
    filter.replaceChildren(new Option('All tasks', ''), new Option('Unassigned', '-'));
    for (const member of Array.from(names).sort((a, b) => a.localeCompare(b))) {
      filter.add(new Option(member, '+' + member));
    }
    if (selected === '-' || names.has(selected.slice(1))) filter.value = selected;
    applyFilter();
  }

  function applyFilter() {
    for (const row of tasks.children) {
      const member = records.get(row.dataset.taskId)?.assignee;
      row.hidden = Boolean(filter.value && filter.value !== (member ? '+' + member : '-'));
    }
    updateCount();
  }

  filter?.addEventListener('change', applyFilter);

  function storeTask(task) {
    updateFilterOptions();
    updateOverview();
    updateCalendar();
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
    item.dataset.taskId = task.id;
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const title = document.createElement('span');
    title.textContent = task.name;
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => {
      task.done = checkbox.checked;
      showDueDate(due, task);
      storeTask(task);
    });
    label.append(checkbox, title);
    item.append(label);
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit task';
    const due = document.createElement('time');
    const owner = document.createElement('small');
    function display() {
      owner.textContent = task.assignee ? 'Assigned to ' + task.assignee : 'Unassigned';
      title.textContent = task.name;
      edit.setAttribute('aria-label', 'Edit task: ' + task.name);
      due.hidden = !task.date;
      due.dateTime = task.date;
      showDueDate(due, task);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete task';
    remove.addEventListener('click', () => {
      remove.disabled = true;
      const prompt = document.createElement('div');
      const question = document.createElement('p');
      question.textContent = 'Delete “' + task.name + '”?';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => {
        prompt.remove();
        remove.disabled = false;
        remove.focus();
      });
      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.textContent = 'Delete';
      confirm.addEventListener('click', () => {
        records.delete(task.id);
        // An exported file can contain this task in its initial snapshot.
        storeTask({id:task.id, deleted:true});
        item.remove();
        updateCount();
        name.focus();
      });
      prompt.append(question, cancel, confirm);
      item.append(prompt);
      cancel.focus();
    });
    if (assignee) item.append(owner);
    item.append(due, edit, remove);
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
      const editedOwner = assignee ? field('Team member', 'text', task.assignee || '') : null;
      if (editedOwner) editedOwner.maxLength = 120;
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
        if (editedOwner) task.assignee = editedOwner.value.trim();
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
    if (assignee) task.assignee = assignee.value.trim();
    renderTask(task);
    storeTask(task);
    updateCount();
    name.value = '';
    date.value = '';
    if (assignee) assignee.value = '';
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
            if (task.deleted === true) restored.delete(task.id);
            else restored.set(task.id, task);
          } catch {}
        }
      }
    } catch {
      status.textContent = 'Use Save HTML with tasks to keep a copy on this device.';
    }
  } else {
    status.textContent = 'Use Save HTML with tasks to reopen this board later.';
  }
  let dayTimer;
  function syncDay() {
    clearTimeout(dayTimer);
    const now = new Date();
    const day = localDay(now);
    if (today !== day) {
      today = day;
      for (const row of tasks.children) showDueDate(row.querySelector('time'), records.get(row.dataset.taskId));
      updateCalendar();
    }
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    dayTimer = setTimeout(syncDay, midnight.getTime() - now.getTime());
  }
  syncDay();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncDay();
  });
  restored.forEach(renderTask);
  updateOverview();
  updateFilterOptions();
  updateCalendar();
  updateCount();

  document.getElementById('save-board').addEventListener('click', () => {
    const copy = board.cloneNode(true);
    copy.dataset.tasks = encodeURIComponent(JSON.stringify(snapshot()));
    copy.dataset.board = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random();
    copy.querySelector('#project-summary')?.remove();
    copy.querySelector('#deadline-agenda')?.remove();
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
