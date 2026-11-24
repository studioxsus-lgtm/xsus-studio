import { generateAndroidKotlin } from "./android-kotlin-generator.js";

export function generateAndroidUI(input, {theme="system", primarySeed="#2563EB", navigation="single_screen"} = {}) {
  if (!["system","dark","light"].includes(theme) ||
      typeof primarySeed !== "string" || !/^#[0-9a-fA-F]{6}$/.test(primarySeed) ||
      !["single_screen","bottom_bar"].includes(navigation)) throw new Error("Unsupported UI configuration");
  const files = generateAndroidKotlin(input);
  const pkg = input.applicationId;
  const name = JSON.stringify(input.displayName.trim()).replace(/\$/g, "\\$");
  const dark = theme === "system" ? "isSystemInDarkTheme()" : String(theme === "dark");
  const color = "Color(0xFF" + primarySeed.slice(1).toUpperCase() + ")";
  files[1].content = `package ${pkg}.ui
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

@Composable
fun AppTheme(content: @Composable () -> Unit) {
    val seed = ${color}
    MaterialTheme(colorScheme = if (${dark}) darkColorScheme(primary = seed) else lightColorScheme(primary = seed), content = content)
}
`;
  const bar = navigation === "bottom_bar" ? `NavigationBar {
            NavigationBarItem(selected = tab == 0, onClick = { tab = 0 }, icon = { Text("H") }, label = { Text("Home") })
            NavigationBarItem(selected = tab == 1, onClick = { tab = 1 }, icon = { Text("P") }, label = { Text("Profile") })
        }` : "";
  files[2].content = `package ${pkg}.ui
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun AppScreen() {
    var tab by rememberSaveable { mutableStateOf(0) }
    var value by rememberSaveable { mutableStateOf("") }
    var saved by rememberSaveable { mutableStateOf("") }
    Scaffold(bottomBar = { ${bar} }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(${name}, style = MaterialTheme.typography.headlineMedium)
            if (tab == 0) {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Welcome", style = MaterialTheme.typography.titleLarge)
                        OutlinedTextField(value = value, onValueChange = { value = it }, label = { Text("Name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                        Button(onClick = { saved = value.trim() }, enabled = value.isNotBlank()) { Text("Confirm") }
                        if (saved.isNotEmpty()) Text(saved)
                    }
                }
            } else {
                Text("Profile", style = MaterialTheme.typography.titleLarge)
                Text(saved.ifEmpty { "No name entered" })
            }
        }
    }
}
`;
  return files;
}
