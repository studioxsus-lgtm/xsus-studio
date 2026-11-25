import { generatePersistentAndroidTasks } from "./android-persistent-task-generator.js";

import { taskPages } from "./task-pages.js";

export function generateAndroidGradleProject(input, options = {}) {
  const { minSdk = 26, ...ui } = options;
  if (!Number.isInteger(minSdk) || minSdk < 23 || minSdk > 35) throw new Error("Unsupported minimum SDK");
  const multiPage = ui.navigation === "bottom_bar";
  const files = generatePersistentAndroidTasks(input, multiPage ? {...ui, navigation:"single_screen"} : ui);
  if (multiPage) {
    const screen = files.find(file => file.path.endsWith("/ui/AppScreen.kt"));
    screen.content = taskPages(input.applicationId);
  }
  const id = input.applicationId;
  const xml = input.displayName.trim().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
  // Android resource strings require additional escaping beyond XML.
  const label = xml.replace(/\\/g,"\\\\").replace(/&apos;/g,"\\&apos;").replace(/&quot;/g,"\\&quot;");
  return [...files,
    {path:"settings.gradle.kts",content:`pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "XSUSAndroid"
include(":app")
`},
    {path:"build.gradle.kts",content:`plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}
`},
    {path:"gradle.properties",content:"android.useAndroidX=true\norg.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\n"},
    {path:"app/build.gradle.kts",content:`plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "${id}"
    compileSdk = 35
    defaultConfig {
        applicationId = "${id}"
        minSdk = ${minSdk}
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }
    buildFeatures { compose = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.foundation:foundation")
}
`},
    {path:"app/src/main/AndroidManifest.xml",content:`<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="@string/app_name" android:allowBackup="false" android:theme="@android:style/Theme.Material.Light.NoActionBar">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
`},
    {path:"app/src/main/res/values/strings.xml",content:`<resources><string name="app_name">"${label}"</string></resources>\n`}
  ];
}

