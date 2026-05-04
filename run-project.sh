#!/usr/bin/env bash
# Run full Neighborly stack (backend + Flutter web)
# Usage: ./run-project.sh [start|stop|restart|build]

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${PORT:-8077}"
FLUTTER_PORT="${FLUTTER_WEB_PORT:-9088}"
API_BASE_URL="${API_BASE_URL:-http://localhost:$BACKEND_PORT}"

colors() {
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m' # No Color
}

check_dependencies() {
  echo -e "${BLUE}Checking dependencies...${NC}"

  if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
  fi

  if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
  fi

  if ! command -v flutter &> /dev/null; then
    echo -e "${RED}Error: Flutter is not installed${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ All dependencies found${NC}"
}

check_backend_env() {
  if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo -e "${YELLOW}Warning: .env file not found in project root${NC}"
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
      echo -e "${YELLOW}Creating .env from .env.example...${NC}"
      cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    fi
  fi
}

install_backend_deps() {
  echo -e "${BLUE}Installing backend dependencies...${NC}"
  cd "$SCRIPT_DIR"
  if [ ! -d "node_modules" ]; then
    npm install
  fi
  echo -e "${GREEN}✓ Backend dependencies installed${NC}"
}

install_flutter_deps() {
  echo -e "${BLUE}Installing Flutter dependencies...${NC}"
  cd "$SCRIPT_DIR/flutter_project"
  flutter pub get
  echo -e "${GREEN}✓ Flutter dependencies installed${NC}"
}

build_flutter() {
  echo -e "${BLUE}Building Flutter web app...${NC}"
  cd "$SCRIPT_DIR/flutter_project"
  flutter build web --release
  echo -e "${GREEN}✓ Flutter web build complete${NC}"
}

start_backend() {
  echo -e "${BLUE}Starting Backend on port $BACKEND_PORT...${NC}"
  cd "$SCRIPT_DIR"

  # Check if already running
  if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Backend already running on port $BACKEND_PORT${NC}"
    return
  fi

  # Start backend in background
  npm run dev &
  BACKEND_PID=$!
  echo $BACKEND_PID > "$SCRIPT_DIR/.backend.pid"

  # Wait for backend to be ready
  echo -e "${BLUE}Waiting for backend to start...${NC}"
  for i in {1..30}; do
    if curl -s http://localhost:$BACKEND_PORT/api/health >/dev/null 2>&1; then
      echo -e "${GREEN}✓ Backend started successfully${NC}"
      return
    fi
    sleep 1
  done

  echo -e "${RED}Backend failed to start within 30 seconds${NC}"
  exit 1
}

start_flutter() {
  echo -e "${BLUE}Starting Flutter Web on port $FLUTTER_PORT...${NC}"
  cd "$SCRIPT_DIR/flutter_project"

  # Check if already running
  if lsof -Pi :$FLUTTER_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Flutter already running on port $FLUTTER_PORT${NC}"
    return
  fi

  # Kill any existing Flutter processes on the port
  fuser -k "${FLUTTER_PORT}/tcp" 2>/dev/null || true
  sleep 1

  # Start Flutter
  flutter run -d web-server \
    --web-hostname=0.0.0.0 \
    --web-port=$FLUTTER_PORT \
    --dart-define=API_BASE_URL="$API_BASE_URL" &
  FLUTTER_PID=$!
  echo $FLUTTER_PID > "$SCRIPT_DIR/.flutter.pid"

  echo -e "${GREEN}✓ Flutter web started${NC}"
}

stop_services() {
  echo -e "${BLUE}Stopping services...${NC}"

  # Stop backend
  if [ -f "$SCRIPT_DIR/.backend.pid" ]; then
    kill $(cat "$SCRIPT_DIR/.backend.pid") 2>/dev/null || true
    rm -f "$SCRIPT_DIR/.backend.pid"
    echo -e "${GREEN}✓ Backend stopped${NC}"
  fi

  # Stop Flutter
  if [ -f "$SCRIPT_DIR/.flutter.pid" ]; then
    kill $(cat "$SCRIPT_DIR/.flutter.pid") 2>/dev/null || true
    rm -f "$SCRIPT_DIR/.flutter.pid"
    echo -e "${GREEN}✓ Flutter stopped${NC}"
  fi

  # Kill any processes on the ports
  fuser -k "${BACKEND_PORT}/tcp" 2>/dev/null || true
  fuser -k "${FLUTTER_PORT}/tcp" 2>/dev/null || true

  echo -e "${GREEN}✓ All services stopped${NC}"
}

show_status() {
  echo -e "${BLUE}================================${NC}"
  echo -e "${GREEN}Project Status:${NC}"
  echo -e "${BLUE}================================${NC}"

  # Backend status
  if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend: Running on http://localhost:$BACKEND_PORT${NC}"
  else
    echo -e "${RED}✗ Backend: Not running${NC}"
  fi

  # Flutter status
  if lsof -Pi :$FLUTTER_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Flutter Web: Running on http://localhost:$FLUTTER_PORT${NC}"
  else
    echo -e "${RED}✗ Flutter Web: Not running${NC}"
  fi

  echo -e "${BLUE}================================${NC}"
  echo -e "${YELLOW}API Base URL: $API_BASE_URL${NC}"
  echo -e "${BLUE}================================${NC}"
}

logs() {
  echo -e "${BLUE}Recent logs:${NC}"
  if [ -f "$SCRIPT_DIR/.backend.pid" ]; then
    echo -e "${YELLOW}Backend PID: $(cat "$SCRIPT_DIR/.backend.pid")${NC}"
  fi
  if [ -f "$SCRIPT_DIR/.flutter.pid" ]; then
    echo -e "${YELLOW}Flutter PID: $(cat "$SCRIPT_DIR/.flutter.pid")${NC}"
  fi
}

main() {
  colors
  COMMAND="${1:-start}"

  case $COMMAND in
    start)
      check_dependencies
      check_backend_env
      install_backend_deps
      install_flutter_deps
      start_backend
      sleep 3
      start_flutter
      sleep 2
      show_status
      echo ""
      echo -e "${GREEN}🚀 Project is running!${NC}"
      echo -e "${YELLOW}Access the app at: http://localhost:$FLUTTER_PORT${NC}"
      echo ""
      echo -e "${BLUE}Useful commands:${NC}"
      echo -e "  ./run-project.sh stop      - Stop all services"
      echo -e "  ./run-project.sh restart   - Restart all services"
      echo -e "  ./run-project.sh status    - Check service status"
      ;;
    stop)
      stop_services
      ;;
    restart)
      stop_services
      sleep 2
      start_backend
      sleep 3
      start_flutter
      sleep 2
      show_status
      ;;
    build)
      check_dependencies
      install_flutter_deps
      build_flutter
      ;;
    status)
      show_status
      ;;
    logs)
      logs
      ;;
    *)
      echo "Usage: $0 [start|stop|restart|build|status|logs]"
      exit 1
      ;;
  esac
}

main "$@"
