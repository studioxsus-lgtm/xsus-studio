import { generateAndroidUI } from "./android-ui-generator.js";

export function generateAndroidTasks(input, options = {}) {
  const files = generateAndroidUI(input, options);
  if (options.navigation && options.navigation !== "single_screen") throw new Error("Task navigation not supported yet");
  const pkg = input.applicationId;
  const root = "app/src/main/java/" + pkg.replaceAll(".", "/");
  files.push({path:root+"/data/Task.kt",content:`package ${pkg}.data

data class Task(val id: Long, val title: String, val done: Boolean = false)
`});
  files[2].content = `package ${pkg}.ui
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ${pkg}.data.Task

@Composable
fun AppScreen() {
    var tasks by remember { mutableStateOf(emptyList<Task>()) }
    var nextId by remember { mutableStateOf(1L) }
    var title by remember { mutableStateOf("") }
    var query by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<Long?>(null) }
    var pendingOnly by remember { mutableStateOf(false) }
    val visible = tasks.filter { it.title.contains(query, ignoreCase = true) && (!pendingOnly || !it.done) }
    Scaffold { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Tasks", style = MaterialTheme.typography.headlineMedium)
            Text("Completed: " + tasks.count { it.done } + " / " + tasks.size)
            OutlinedTextField(value = title, onValueChange = { title = it.take(200) },
                label = { Text("Task title") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(enabled = title.isNotBlank() && (editing != null || tasks.size < 1000), onClick = {
                    val id = editing
                    if (id == null) { tasks = tasks + Task(nextId++, title.trim()) }
                    else { tasks = tasks.map { if (it.id == id) it.copy(title = title.trim()) else it } }
                    title = ""; editing = null
                }) { Text(if (editing == null) "Add" else "Save") }
                if (editing != null) TextButton(onClick = { editing = null; title = "" }) { Text("Cancel") }
            }
            OutlinedTextField(value = query, onValueChange = { query = it.take(200) },
                label = { Text("Search") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Row { Checkbox(checked = pendingOnly, onCheckedChange = { pendingOnly = it }); Text("Pending only") }
            LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(visible, key = { it.id }) { task ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp)) {
                            Row {
                                Checkbox(checked = task.done, onCheckedChange = { checked ->
                                    tasks = tasks.map { if (it.id == task.id) it.copy(done = checked) else it }
                                })
                                Text(task.title, modifier = Modifier.weight(1f))
                            }
                            Row {
                                TextButton(onClick = { editing = task.id; title = task.title }) { Text("Edit") }
                                TextButton(onClick = {
                                    tasks = tasks.filterNot { it.id == task.id }
                                    if (editing == task.id) { editing = null; title = "" }
                                }) { Text("Delete") }
                            }
                        }
                    }
                }
            }
        }
    }
}
`;
  return files;
}
