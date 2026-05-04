#!/usr/bin/env bash
# Flutter web with fixed host/port (WSL: open http://localhost:PORT from Windows).
# Backend: from repo root run `npm run dev` (API port from .env, e.g. PORT=8077 — not 8080).
set -euo pipefail
cd "$(dirname "$0")"
HOST="${FLUTTER_WEB_HOSTNAME:-0.0.0.0}"
PORT="${FLUTTER_WEB_PORT:-9088}"
: "${API_BASE_URL:=http://localhost:8077}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Flutter web:  http://127.0.0.1:${PORT}  (from Windows: http://localhost:${PORT})"
echo "  Default port is ${PORT} — not 9000. If you see a blank page, use this URL."
echo "  Blank page? Google CDN may be blocked — try: FLUTTER_NO_WEB_CDN=1 ./run-web.sh"
echo "  API:          ${API_BASE_URL}"
echo "  Port in use?  ./restart-web.sh  or  FLUTTER_WEB_KILL_PORT=1 ./run-web.sh"
echo ""
echo "  WSL2 / DevTools: if flutter run -d web-server crashes (WebSocket / DDC):"
echo "  • Recommended dev: Chrome (stable with DDC):"
echo "    flutter run -d chrome --web-port=9088 --dart-define=API_BASE_URL=http://localhost:8077"
echo "  • If you must use web-server (0.0.0.0): release build without DDC:"
echo "    flutter run -d web-server --web-hostname=0.0.0.0 --web-port=9088 --release --dart-define=API_BASE_URL=http://localhost:8077"
echo "  • Sometimes the flutter process exits but http://127.0.0.1:${PORT} still responds;"
echo "    for stable dev tools prefer the chrome device."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# If PORT (e.g. 9088) is still bound by a previous flutter/web-server, bind() will fail.
_port_busy() {
  if command -v ss >/dev/null 2>&1; then
    ss -tln 2>/dev/null | grep -qE ":${1} " && return 0
  fi
  if command -v fuser >/dev/null 2>&1; then
    fuser "${1}/tcp" >/dev/null 2>&1 && return 0
  fi
  return 1
}

if _port_busy "${PORT}"; then
  if [ "${FLUTTER_WEB_KILL_PORT:-0}" = "1" ]; then
    echo "Port ${PORT} is in use — freeing..."
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    sleep 1
  else
    echo ""
    echo "Port ${PORT} is already in use (often an old flutter run still listening)."
    echo "Try one of:"
    echo "   • ./restart-web.sh"
    echo "   • fuser -k ${PORT}/tcp   then ./run-web.sh again"
    echo "   • FLUTTER_WEB_KILL_PORT=1 ./run-web.sh"
    echo "   • FLUTTER_WEB_PORT=9087 ./run-web.sh   (avoid 9090 — reserved for npm admin)"
    echo ""
    exit 1
  fi
fi

EXTRA=()
if [ "${FLUTTER_NO_WEB_CDN:-0}" = "1" ]; then
  EXTRA+=(--no-web-resources-cdn)
fi

exec flutter run -d web-server \
  --web-hostname="$HOST" \
  --web-port="$PORT" \
  --dart-define=API_BASE_URL="${API_BASE_URL}" \
  "${EXTRA[@]}"
