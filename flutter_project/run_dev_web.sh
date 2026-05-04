#!/usr/bin/env bash
# Fast local Flutter web: hot reload with "r", hot restart "R". No Docker rebuild.
# Usage:
#   ./run_dev_web.sh
#   API_BASE_URL=http://localhost:3000 ./run_dev_web.sh   # if web-app maps to host port 3000
set -euo pipefail
cd "$(dirname "$0")"
: "${API_BASE_URL:=http://localhost:8077}"
exec flutter run -d web-server \
  --web-hostname=0.0.0.0 \
  --web-port=7357 \
  --dart-define=API_BASE_URL="${API_BASE_URL}"
