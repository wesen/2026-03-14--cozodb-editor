#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../../../../../.. && pwd)"
cd "$repo_root"

echo "== date =="
date -Iseconds
echo

echo "== preset surfaces =="
rg -n "Current(Cozo|JavaScript)|current(Cozo|JavaScript)|VITE_NOTEBOOK_PRESET|preset" \
  backend/main.go \
  backend/pkg/notebook \
  frontend/src/App.tsx \
  frontend/src/notebook \
  -g'*.go' -g'*.ts' -g'*.tsx'
echo

echo "== runtime seam =="
sed -n '1,200p' backend/pkg/notebook/runtime.go
echo

echo "== profile seam =="
sed -n '1,200p' backend/pkg/notebook/profile.go
echo

echo "== existing preset constructors =="
sed -n '1,220p' backend/pkg/notebook/current_cozo.go
echo
sed -n '1,220p' backend/pkg/notebook/current_javascript.go
echo

echo "== frontend preset configs =="
sed -n '1,200p' frontend/src/notebook/currentCozoConfig.ts
echo
sed -n '1,200p' frontend/src/notebook/currentJavaScriptConfig.ts
