export const boardMarkup = `<div class="task-board">
  <label>Task name <input id="task-name" maxlength="200" autocomplete="off" required></label>
  <label>Due date <input id="task-date" type="date"></label>
  <button id="add-task" type="button">Add task</button>
  <p id="task-count" role="status">0 tasks</p>
  <ul id="tasks"></ul>
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

  function addTask() {
    name.value = name.value.trim();
    if (!name.reportValidity() || !date.reportValidity()) return;
    const item = document.createElement('li');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const title = document.createElement('span');
    title.textContent = name.value;
    label.append(checkbox, title);
    item.append(label);
    if (date.value) {
      const due = document.createElement('time');
      due.dateTime = date.value;
      due.textContent = 'Due ' + date.value;
      item.append(due);
    }
    tasks.append(item);
    updateCount();
    name.value = '';
    date.value = '';
    name.focus();
  }

  document.getElementById('add-task').addEventListener('click', addTask);
  name.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing) addTask();
  });
  tasks.addEventListener('change', updateCount);
}

export const boardScript = '(' + runTaskBoard.toString() + ')();';
