#!/usr/bin/env bash
set -eu
pkg=com.xsusstudio.app.pabababababababababababababababab
activity="$pkg/com.xsusstudio.host.MainActivity"
wait_for_heading() {
  for try in {1..20}; do
    adb shell uiautomator dump /sdcard/xsus-ui.xml >/dev/null
    if adb shell cat /sdcard/xsus-ui.xml | grep -F "$1" >/dev/null; then return 0; fi
    sleep 1
  done
  return 1
}
adb install /tmp/restaurant.apk
adb shell am start -W -n "$activity"
wait_for_heading 'XSUS booking saved'
adb shell am force-stop "$pkg"
adb shell am start -W -n "$activity"
wait_for_heading 'XSUS booking restored'
adb install -r /tmp/restaurant-v2.apk
adb shell dumpsys package "$pkg" | grep -F 'versionCode=2 ' >/dev/null
adb shell am start -W -n "$activity"
wait_for_heading 'XSUS v2 retained original booking'
