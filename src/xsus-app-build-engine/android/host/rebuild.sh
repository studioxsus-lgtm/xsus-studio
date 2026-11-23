#!/usr/bin/env bash
# Requires a JDK, Android platform 35 and SDK build-tools 35.0.0.
set -euo pipefail
cd "$(dirname "$0")"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
sdk="${ANDROID_HOME:?Set ANDROID_HOME to the SDK directory}"
tools="$sdk/build-tools/35.0.0"
platform="$sdk/platforms/android-35/android.jar"
mkdir -p "$work/classes" "$work/dex"
javac -source 8 -target 8 -bootclasspath "$platform" -d "$work/classes" MainActivity.java
"$tools/d8" --min-api 24 --lib "$platform" --output "$work/dex" "$work"/classes/com/xsusstudio/host/*.class
"$tools/aapt" package -f -M AndroidManifest.xml -I "$platform" -F "$work/manifest.apk"
unzip -p "$work/manifest.apk" AndroidManifest.xml > "$work/manifest.bin"
python3 - "$work" <<'PY'
import base64,json,sys
from pathlib import Path
root=Path(sys.argv[1])
files={'manifest':'manifest.bin','dex':'dex/classes.dex'}
data={name:base64.b64encode((root/path).read_bytes()).decode() for name,path in files.items()}
Path('../distribution/host.json').write_text(json.dumps(data)+'\n')
PY
