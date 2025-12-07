#!/usr/bin/env bash

set -euo pipefail

# Arranca backend y frontend en paralelo. Detiene ambos al salir.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

cleanup() {
  trap - EXIT INT TERM
  kill 0 >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo "Instalando dependencias backend..."
  npm --prefix "$BACKEND_DIR" install
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Instalando dependencias frontend..."
  npm --prefix "$FRONTEND_DIR" install
fi

if [ -z "${VITE_API_BASE:-}" ]; then
  HOST_IP=$(
    ipconfig getifaddr en0 2>/dev/null ||
      ipconfig getifaddr en1 2>/dev/null ||
      hostname -I 2>/dev/null | awk '{print $1}' ||
      hostname 2>/dev/null
  )
  API_BASE="http://${HOST_IP:-localhost}:3000/api"
else
  API_BASE="$VITE_API_BASE"
fi

echo "Levantando backend (puerto 3000)..."
npm --prefix "$BACKEND_DIR" run dev &

echo "Levantando frontend con VITE_API_BASE=$API_BASE (puerto 5173)..."
VITE_API_BASE="$API_BASE" npm --prefix "$FRONTEND_DIR" run dev &

wait
