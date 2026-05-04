#!/usr/bin/env bash
# One-shot: free the web port and restart Flutter (when a hard browser reload is not enough).
set -euo pipefail
cd "$(dirname "$0")"
PORT="${FLUTTER_WEB_PORT:-9088}"
HOST="${FLUTTER_WEB_HOSTNAME:-0.0.0.0}"
: "${API_BASE_URL:=http://localhost:8077}"

echo "🛑 Stopping Flutter web server on port ${PORT}..."
fuser -k "${PORT}/tcp" 2>/dev/null || echo "No process found on port ${PORT}"
sleep 2

echo "📦 Checking Flutter dependencies..."
flutter pub get

echo "🔍 Analyzing code (warnings are OK)..."
flutter analyze || true

echo "🚀 Starting Flutter web server..."
echo "⏳ This may take a minute for the first build..."

EXTRA=()
if [ "${FLUTTER_NO_WEB_CDN:-0}" = "1" ]; then
  EXTRA+=(--no-web-resources-cdn)
fi

exec flutter run -d web-server \
  --web-hostname="$HOST" \
  --web-port="$PORT" \
  --dart-define=API_BASE_URL="${API_BASE_URL}" \
  "${EXTRA[@]}"
