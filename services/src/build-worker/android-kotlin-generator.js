// Deterministic Kotlin starter generator. No shell, filesystem or network access.
const reserved = new Set("as break class continue do else false for fun if in interface is null object package return super this throw true try typealias typeof val var when while".split(" "));
export function generateAndroidKotlin({applicationId, displayName} = {}) {
  if (typeof applicationId !== "string" || applicationId.length > 150 ||
      !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(applicationId) ||
      applicationId.split(".").some(part => reserved.has(part))) {
    throw new Error("Invalid Android application ID");
  }
  if (typeof displayName !== "string" || !displayName.trim() || displayName.length > 80 || /[\x00-\x1f\x7f]/.test(displayName)) {
    throw new Error("Invalid display name");
  }
  const name = JSON.stringify(displayName.trim()).replace(/\$/g, "\\$");
  const root = "app/src/main/java/" + applicationId.replaceAll(".", "/");
  return [
    {path: root + "/MainActivity.kt", content: `package ${applicationId}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import ${applicationId}.ui.AppScreen
import ${applicationId}.ui.AppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { AppTheme { AppScreen() } }
    }
}
`},
    {path: root + "/ui/AppTheme.kt", content: `package ${applicationId}.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

@Composable
fun AppTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme(), content = content)
}
`},
    {path: root + "/ui/AppScreen.kt", content: `package ${applicationId}.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

@Composable
fun AppScreen() {
    Surface(modifier = Modifier.fillMaxSize()) {
        Box(contentAlignment = Alignment.Center) {
            Text(text = ${name})
        }
    }
}
`}
  ];
}
