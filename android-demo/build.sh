#!/usr/bin/env bash
# Builds one Android app from the web demo.
#   ./build.sh member  → TUGHE-Huduma-demo.apk  (members' app, opens index.html)
#   ./build.sh staff   → TUGHE-Dawati-demo.apk  (officers' portal, opens officer.html)
set -euo pipefail
VARIANT="$1"; RUN="${2:-1}"
cd "$(dirname "$0")"
rm -rf www android
mkdir -p www
cp -r ../docs/. www/
# The service worker is for the website only; the app already ships every file offline.
for f in www/index.html www/officer.html; do sed -i 's#<script>if("serviceWorker" in navigator)[^<]*</script>##' "$f"; done

if [ "$VARIANT" = "staff" ]; then
  cp www/officer.html www/index.html
  APP_ID="tz.or.tughe.dawati.demo"; APP_NAME="TUGHE Dawati"; BG="#1B2160"; OUT="TUGHE-Dawati-demo.apk"
else
  APP_ID="tz.or.tughe.huduma.demo"; APP_NAME="TUGHE Huduma"; BG="#2D3597"; OUT="TUGHE-Huduma-demo.apk"
fi
cat > capacitor.config.json <<JSON
{ "appId": "$APP_ID", "appName": "$APP_NAME", "webDir": "www", "android": { "backgroundColor": "$BG" } }
JSON

npx cap add android
npx cap sync android
python3 make_icons.py ../docs/icon-512.png "$BG"
sed -i "s/versionCode [0-9]*/versionCode $RUN/" android/app/build.gradle
sed -i "s/versionName \"[^\"]*\"/versionName \"1.0.$RUN\"/" android/app/build.gradle
(cd android && chmod +x gradlew && ./gradlew assembleDebug --no-daemon -q)
cp android/app/build/outputs/apk/debug/app-debug.apk "$OUT"
echo "built $OUT"
