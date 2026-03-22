#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../../../../../.." && pwd)"
cd "$repo_root"

echo "# Backend notebook package files"
rg --files backend/pkg/notebook | sort

echo
echo "# Frontend notebook package files"
rg --files frontend/src/notebook | sort

echo
echo "# Frontend transport files"
rg --files frontend/src/transport | sort

echo
echo "# Frontend theme files"
rg --files frontend/src/theme | sort

echo
echo "# Key exported mount points and hooks"
rg -n "func MountHTTPRoutes|func MountWebSocketRoutes|func NewService|func OpenService|export default function NotebookPage|export function NotebookPageContainer|export function useHintsSocket|export const notebookReducer" \
  backend/pkg/notebook frontend/src/notebook frontend/src/transport frontend/src/notebook/state
