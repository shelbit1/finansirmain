#!/bin/sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STANDALONE="$ROOT/.next/standalone"

if [ ! -f "$STANDALONE/server.js" ]; then
  echo "ERROR: $STANDALONE/server.js not found. Run npm run build first."
  exit 1
fi

cd "$STANDALONE"
export HOSTNAME=0.0.0.0
export PORT="${PORT:-3000}"
exec node server.js
