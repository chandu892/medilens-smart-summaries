#!/usr/bin/env bash
# MediLens — start both frontend and backend in parallel
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "=========================================="
echo " MediLens — Starting Development Servers"
echo "=========================================="
echo ""

# ── Backend ──────────────────────────────────────
BACKEND="$ROOT/backend"

RECREATE_VENV=0
if [ ! -f "$BACKEND/venv/bin/activate" ]; then
  RECREATE_VENV=1
elif ! "$BACKEND/venv/bin/python" -c "import sys" 2>/dev/null; then
  RECREATE_VENV=1
fi

if [ "$RECREATE_VENV" -eq 1 ]; then
  echo "[1/3] Creating Python virtual environment..."
  rm -rf "$BACKEND/venv"
  python3 -m venv "$BACKEND/venv"
fi

echo "[2/3] Starting FastAPI backend on port 8000..."
(
  cd "$BACKEND"
  source venv/bin/activate
  pip install -r requirements.txt --quiet
  uvicorn main:app --reload --port 8000
) &
BACKEND_PID=$!

# Give backend a moment to start
sleep 3

# ── Frontend ─────────────────────────────────────
FRONTEND="$ROOT/frontend"

echo "[3/3] Starting Vite frontend..."
(
  cd "$FRONTEND"
  npm install --silent
  npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo " MediLens is running!"
echo ""
echo " Frontend → http://localhost:8082"
echo " Backend  → http://localhost:8000"
echo " API docs → http://localhost:8000/docs"
echo " Doctor login:  doctor@medilens.demo  (Dr. Anjali Mehta)"
echo " Patient login: patient@medilens.demo (Ravi Kumar)"
echo " Password:      MediLens@123"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Wait for both processes; Ctrl+C kills both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait $BACKEND_PID $FRONTEND_PID
