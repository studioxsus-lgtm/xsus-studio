export function taskPages(packageName) {
  return `package ${packageName}.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import ${packageName}.R
import ${packageName}.data.Task
import ${packageName}.data.TaskStore

@Composable
fun AppScreen() {
    val context = LocalContext.current
    val store = remember(context) { TaskStore(context.applicationContext) }
    val loaded = remember(store) { runCatching { store.load() } }
    var tasks by remember(store) { mutableStateOf(loaded.getOrDefault(emptyList())) }
    var error by remember { mutableStateOf(if (loaded.isFailure) "Saved tasks could not be read." else "") }
    var page by rememberSaveable { mutableStateOf("Home") }
    var origin by rememberSaveable { mutableStateOf("Home") }
    var title by rememberSaveable { mutableStateOf("") }
    var editId by rememberSaveable { mutableStateOf<Long?>(null) }
    var query by rememberSaveable { mutableStateOf("") }
    var pending by rememberSaveable { mutableStateOf(false) }
    fun persist(updated: List<Task>): Boolean {
        if (loaded.isFailure) return false
        return runCatching { store.save(updated) }.fold(
            onSuccess = { tasks = updated; error = ""; true },
            onFailure = { error = "Changes could not be saved."; false }
        )
    }
    fun openEditor(task: Task?) {
        origin = page
        editId = task?.id
        title = task?.title.orEmpty()
        page = "Editor"
    }
    BackHandler(enabled = page != "Home") { page = if (page == "Editor") origin else "Home" }
    Scaffold(bottomBar = {
        if (page != "Editor") NavigationBar {
            listOf("Home" to "⌂", "Tasks" to "☷").forEach { (name, symbol) ->
                NavigationBarItem(selected = page == name, onClick = { page = name },
                    icon = { Text(symbol) }, label = { Text(name) })
            }
        }
    }) { insets ->
        Column(Modifier.fillMaxSize().padding(insets).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(when (page) {
                "Home" -> stringResource(R.string.app_name)
                "Editor" -> if (editId == null) "New task" else "Edit task"
                else -> "Tasks"
            }, style = MaterialTheme.typography.headlineMedium)
            if (error.isNotEmpty()) Text(error, color = MaterialTheme.colorScheme.error)
            when (page) {
                "Home" -> Column(Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    val completed = tasks.count { it.done }
                    ElevatedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Task overview", style = MaterialTheme.typography.titleLarge)
                            Text("$completed of \${tasks.size} completed")
                            LinearProgressIndicator(progress = { if (tasks.isEmpty()) 0f else completed.toFloat() / tasks.size }, modifier = Modifier.fillMaxWidth())
                        }
                    }
                    Button(onClick = { openEditor(null) }, enabled = loaded.isSuccess && tasks.size < 1000) { Text("New task") }
                    TextButton(onClick = { page = "Tasks" }) { Text("View tasks") }
                }
                "Editor" -> Column(Modifier.verticalScroll(rememberScrollState()).imePadding(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(value = title, onValueChange = { title = it.take(200) },
                        label = { Text("Task title") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Button(enabled = loaded.isSuccess && title.isNotBlank(), onClick = {
                        val id = editId
                        val next = (tasks.maxOfOrNull { it.id } ?: 0L) + 1
                        val updated = if (id == null) {
                            if (tasks.size >= 1000 || next == Long.MAX_VALUE) return@Button
                            tasks + Task(next, title.trim())
                        } else tasks.map { if (it.id == id) it.copy(title = title.trim()) else it }
                        if (persist(updated)) page = "Tasks"
                    }) { Text("Save task") }
                    TextButton(onClick = { page = origin }) { Text("Cancel") }
                }
                "Tasks" -> {
                    OutlinedTextField(value = query, onValueChange = { query = it.take(200) },
                        label = { Text("Search tasks") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        FilterChip(selected = pending, onClick = { pending = !pending }, label = { Text("Pending only") })
                        TextButton(onClick = { openEditor(null) }, enabled = loaded.isSuccess && tasks.size < 1000) { Text("New task") }
                    }
                    val visible = tasks.filter { it.title.contains(query, ignoreCase = true) && (!pending || !it.done) }
                    if (visible.isEmpty()) Text(if (tasks.isEmpty()) "No tasks yet." else "No matching tasks.")
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(visible, key = { it.id }) { task ->
                            ElevatedCard(Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(8.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                                    Checkbox(checked = task.done, onCheckedChange = { done ->
                                        persist(tasks.map { if (it.id == task.id) it.copy(done = done) else it })
                                    })
                                    Text(task.title, Modifier.weight(1f))
                                    TextButton(onClick = { openEditor(task) }) { Text("Edit") }
                                    TextButton(onClick = { persist(tasks.filterNot { it.id == task.id }) }) { Text("Delete") }
                                }
                            }
                        }
                    }
                }
                else -> Unit
            }
        }
    }
}
`;
}
