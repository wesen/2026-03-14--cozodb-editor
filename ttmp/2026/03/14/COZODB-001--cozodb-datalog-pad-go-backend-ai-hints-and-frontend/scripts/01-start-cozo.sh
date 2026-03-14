#!/bin/bash
# Start CozoDB server with in-memory engine for experimentation
# API will be at http://127.0.0.1:9070/text-query

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
COZO_BIN="$PROJECT_ROOT/bin/cozo"

echo "Starting CozoDB v0.7.6 (in-memory)..."
echo "API: http://127.0.0.1:9070/text-query"
echo "Web UI: http://127.0.0.1:9070/"
echo ""

exec "$COZO_BIN" server -e mem -b 127.0.0.1 -P 9070
