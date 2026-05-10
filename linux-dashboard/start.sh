#!/bin/bash
# ╔══════════════════════════════════════════════════════╗
# ║  Linux Dashboard — One-click Startup Script         ║
# ║  Usage: bash start.sh                               ║
# ╚══════════════════════════════════════════════════════╝

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

FRONTEND_URL="http://localhost:5173"
BACKEND_PORT=3001

echo -e "${CYAN}"
echo "  ██╗     ██╗███╗   ██╗██╗   ██╗██╗  ██╗"
echo "  ██║     ██║████╗  ██║██║   ██║╚██╗██╔╝"
echo "  ██║     ██║██╔██╗ ██║██║   ██║ ╚███╔╝ "
echo "  ██║     ██║██║╚██╗██║██║   ██║ ██╔██╗ "
echo "  ███████╗██║██║ ╚████║╚██████╔╝██╔╝ ██╗"
echo "  ╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${CYAN}  System Programming Dashboard v2.0${NC}"
echo ""

# ── Check Node.js ──────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Install it first:${NC}"
  echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
  echo "  sudo apt-get install -y nodejs"
  exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VER}${NC}"

# ── Resolve script directory (works regardless of where you call it from) ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Install backend deps ───────────────────────────────
echo ""
echo -e "${YELLOW}▶ Installing backend dependencies...${NC}"
cd "$SCRIPT_DIR/backend"
npm install --silent
echo -e "${GREEN}✓ Backend ready${NC}"

# ── Install frontend deps ──────────────────────────────
echo ""
echo -e "${YELLOW}▶ Installing frontend dependencies...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install --silent
echo -e "${GREEN}✓ Frontend ready${NC}"

# ── Create .env if missing ─────────────────────────────
cd "$SCRIPT_DIR/backend"
if [ ! -f .env ]; then
  cat > .env << EOF
NODE_ENV=development
PORT=${BACKEND_PORT}
FRONTEND_URL=${FRONTEND_URL}
LOG_LEVEL=info
EOF
  echo -e "${GREEN}✓ Created .env${NC}"
fi

# ── Create required dirs ───────────────────────────────
mkdir -p logs uploads kernel-modules
echo -e "${GREEN}✓ Directories ready${NC}"

# ── Start backend ──────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Starting backend on port ${BACKEND_PORT}...${NC}"
npm run dev &
BACKEND_PID=$!
sleep 2

if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo -e "${RED}✗ Backend failed to start${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Backend running (PID: $BACKEND_PID)${NC}"

# ── Start frontend ─────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Starting frontend on port 5173...${NC}"
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# ── Wait for frontend to be ready, then open browser ──
echo -e "${YELLOW}▶ Waiting for frontend to be ready...${NC}"
MAX_WAIT=30
WAITED=0
while ! curl -s "$FRONTEND_URL" > /dev/null 2>&1; do
  sleep 1
  WAITED=$((WAITED + 1))
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${YELLOW}⚠ Frontend taking longer than expected, opening browser anyway...${NC}"
    break
  fi
done

# ── Open browser ───────────────────────────────────────
echo -e "${YELLOW}▶ Opening browser...${NC}"
if command -v firefox &> /dev/null; then
  firefox "$FRONTEND_URL" &> /dev/null &
  echo -e "${GREEN}✓ Firefox opened${NC}"
elif command -v google-chrome &> /dev/null; then
  google-chrome "$FRONTEND_URL" &> /dev/null &
  echo -e "${GREEN}✓ Chrome opened${NC}"
elif command -v chromium-browser &> /dev/null; then
  chromium-browser "$FRONTEND_URL" &> /dev/null &
  echo -e "${GREEN}✓ Chromium opened${NC}"
elif command -v xdg-open &> /dev/null; then
  xdg-open "$FRONTEND_URL" &> /dev/null &
  echo -e "${GREEN}✓ Browser opened via xdg-open${NC}"
else
  echo -e "${YELLOW}⚠ No browser found. Open manually: ${FRONTEND_URL}${NC}"
fi

# ── Print summary ──────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Dashboard is running!                   ║${NC}"
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}║  Frontend: ${FRONTEND_URL}         ║${NC}"
echo -e "${GREEN}║  Backend:  http://localhost:${BACKEND_PORT}/api     ║${NC}"
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop all services       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Cleanup on exit ────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping services...${NC}"
  kill $BACKEND_PID  2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo -e "${GREEN}Done.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

wait $BACKEND_PID $FRONTEND_PID
