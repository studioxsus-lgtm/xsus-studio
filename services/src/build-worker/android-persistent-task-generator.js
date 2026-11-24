import { generateAndroidTasks } from "./android-task-generator.js";

// Separate opt-in generator preserves the existing in-memory template.
export function generatePersistentAndroidTasks(input, options = {}) {
  const files = generateAndroidTasks(input, options);
  const pkg = input.applicationId;
  const root = "app/src/main/java/" + pkg.replaceAll(".", "/");
  files.push({path:root+"/data/TaskStore.kt",content:`package ${pkg}.data

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class TaskStore(context: Context) {
    private val file = AtomicFile(File(context.filesDir, "tasks.json"))

    fun load(): List<Task> {
        if (!file.baseFile.exists() && !File(file.baseFile.path + ".bak").exists()) return emptyList()
        val bytes = file.openRead().use { it.readNBytes(2000001) }
        require(bytes.size <= 2000000)
        val array = JSONArray(bytes.toString(Charsets.UTF_8))
        require(array.length() <= 1000)
        val tasks = (0 until array.length()).map { index ->
            val item = array.getJSONObject(index)
            Task(item.getLong("id"), item.getString("title"), item.getBoolean("done"))
        }
        require(tasks.all { it.id in 1 until Long.MAX_VALUE && it.title.isNotBlank() && it.title.length <= 200 })
        require(tasks.map { it.id }.distinct().size == tasks.size)
        return tasks
    }

    fun save(tasks: List<Task>) {
        val array = JSONArray()
        tasks.forEach { task ->
            array.put(JSONObject().put("id", task.id).put("title", task.title).put("done", task.done))
        }
        val bytes = array.toString().toByteArray(Charsets.UTF_8)
        require(bytes.size <= 2000000)
        val stream = file.startWrite()
        try {
            stream.write(bytes)
            file.finishWrite(stream)
        } catch (error: Exception) {
            file.failWrite(stream)
            throw error
        }
    }
}
`.replace("it.readNBytes(2000001)", "it.readBytesBounded()") + `
private fun java.io.InputStream.readBytesBounded(): ByteArray {
    val output = java.io.ByteArrayOutputStream()
    val buffer = ByteArray(8192)
    while (true) {
        val count = read(buffer)
        if (count == -1) break
        require(output.size() + count <= 2000000)
        output.write(buffer, 0, count)
    }
    return output.toByteArray()
}
`});
  let screen = files[2].content;
  const replace = (from,to) => {
    if (!screen.includes(from)) throw new Error("Task template contract changed");
    screen = screen.replace(from,to);
  };
  replace("import "+pkg+".data.Task", "import "+pkg+".data.Task\nimport "+pkg+".data.TaskStore\nimport androidx.compose.ui.platform.LocalContext");
  replace("var tasks by remember { mutableStateOf(emptyList<Task>()) }\n    var nextId by remember { mutableStateOf(1L) }", `val context = LocalContext.current
    val store = remember(context) { TaskStore(context.applicationContext) }
    val loaded = remember(store) { runCatching { store.load() } }
    var tasks by remember(store) { mutableStateOf(loaded.getOrDefault(emptyList())) }
    var storageError by remember(store) { mutableStateOf(if (loaded.isFailure) "Unable to read saved tasks" else "") }
    fun persist(updated: List<Task>): Boolean {
        if (loaded.isFailure) return false
        return try {
            store.save(updated)
            tasks = updated
            storageError = ""
            true
        } catch (error: Exception) {
            storageError = "Unable to save tasks"
            false
        }
    }`);
  replace('Text("Tasks", style = MaterialTheme.typography.headlineMedium)', 'Text("Tasks", style = MaterialTheme.typography.headlineMedium)\n            if (storageError.isNotEmpty()) Text(storageError, color = MaterialTheme.colorScheme.error)');
  replace('if (id == null) { tasks = tasks + Task(nextId++, title.trim()) }\n                    else { tasks = tasks.map { if (it.id == id) it.copy(title = title.trim()) else it } }\n                    title = ""; editing = null', `val nextId = (tasks.maxOfOrNull { it.id } ?: 0L) + 1L
                    val updated = if (id == null) {
                        if (nextId == Long.MAX_VALUE) return@Button
                        tasks + Task(nextId, title.trim())
                    } else tasks.map { if (it.id == id) it.copy(title = title.trim()) else it }
                    if (persist(updated)) { title = ""; editing = null }`);
  replace("tasks = tasks.map { if (it.id == task.id) it.copy(done = checked) else it }","persist(tasks.map { if (it.id == task.id) it.copy(done = checked) else it })");
  replace("tasks = tasks.filterNot { it.id == task.id }\n                                    if (editing == task.id)","if (persist(tasks.filterNot { it.id == task.id }) && editing == task.id)");
  files[2].content = screen;
  return files;
}
