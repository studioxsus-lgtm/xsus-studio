export const taskManagerProfile = Object.freeze({
  id: "task-manager",
  matches(goal) { return /\btask\s+(?:manager|management)\b/i.test(goal); },
  productLabel: "Task manager",
  pages: ["Projects overview", "Team board", "Deadline calendar"],
  components: ["Project selector", "Board columns", "Task card", "Deadline indicator", "Team member assignment"],
  dataModels: ["Project", "Task", "Team member", "Deadline"],
  interactions: [
    "Create and update projects",
    "Create, assign and update tasks",
    "Set and change deadlines",
    "Move tasks between board columns"
  ],
  questions: [
    "Which team roles and permissions are needed?",
    "Which task statuses should the board use?",
    "Should deadline reminders be included?",
    "Which time zones and calendars should deadlines support?"
  ]
});
