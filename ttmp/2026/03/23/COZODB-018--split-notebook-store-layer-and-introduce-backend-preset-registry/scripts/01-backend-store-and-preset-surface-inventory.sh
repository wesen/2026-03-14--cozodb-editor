#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../../../../../../" && pwd)"
cd "$repo_root"

echo "# Backend store and preset surface inventory"
echo
echo "## store.go public methods"
rg -n '^func \(s \*Store\) ' backend/pkg/notebook/store.go
echo
echo "## store.go helper functions"
rg -n '^func [a-zA-Z_]' backend/pkg/notebook/store.go
echo
echo "## current preset openers"
rg -n '^type Current|^func OpenCurrent|^func current.*NotebookProfile|^func current.*WebSocketConfig' backend/pkg/notebook/current_*.go
echo
echo "## backend main preset switch"
sed -n '1,180p' backend/main.go
echo
echo "## notebook module entrypoints"
sed -n '1,220p' backend/pkg/notebook/module.go
