#!/bin/bash
# ╔══════════════════════════════════════════════════════╗
# ║  Linux Dashboard - One-click Startup Script         ║
# ║  Usage: bash start.sh                               ║
# ╚══════════════════════════════════════════════════════╝

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# ── Install backend deps ───────────────────────────────
echo ""
echo -e "${YELLOW}▶ Installing backend dependencies...${NC}"
cd "$(dirname "$0")/backend"
npm install --silent
echo -e "${GREEN}✓ Backend ready${NC}"

# ── Install frontend deps ──────────────────────────────
echo ""
echo -e "${YELLOW}▶ Installing frontend dependencies...${NC}"
cd ../frontend
npm install --silent
echo -e "${GREEN}✓ Frontend ready${NC}"

# ── Create .env if missing ─────────────────────────────
cd ../backend
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=info
EOF
  echo -e "${GREEN}✓ Created .env${NC}"
fi

# ── Create required dirs ───────────────────────────────
mkdir -p logs uploads kernel-modules
echo -e "${GREEN}✓ Directories ready${NC}"

# ── Start backend ──────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Starting backend on port 3001...${NC}"
npm run dev &
BACKEND_PID=$!
sleep 2

# Check backend started
if kill -0 $BACKEND_PID 2>/dev/null; then
  echo -e "${GREEN}✓ Backend running (PID: $BACKEND_PID)${NC}"
else
  echo -e "${RED}✗ Backend failed to start${NC}"
  exit 1
fi

# ── Start frontend ─────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ Starting frontend on port 5173...${NC}"
cd ../frontend
npm run dev &
FRONTEND_PID=$!
sleep 3

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Dashboard is running!                   ║${NC}"
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}║  Frontend: http://localhost:5173         ║${NC}"
echo -e "${GREEN}║  Backend:  http://localhost:3001/api     ║${NC}"
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

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
