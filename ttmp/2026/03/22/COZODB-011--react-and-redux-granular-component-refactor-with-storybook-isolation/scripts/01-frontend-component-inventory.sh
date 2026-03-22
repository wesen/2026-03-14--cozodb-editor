#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../../../../../.." && pwd)"

cd "$repo_root"

echo "# Frontend React/Redux Component Inventory"
echo
echo "## Storybook presence"
if [ -d .storybook ]; then
  find .storybook -maxdepth 2 -type f | sort
else
  echo "No .storybook directory present."
fi
echo
echo "## Frontend package scripts and dependencies"
sed -n '1,220p' frontend/package.json
echo
echo "## Key file sizes"
wc -l \
  frontend/src/notebook/NotebookPage.tsx \
  frontend/src/notebook/NotebookCellCard.tsx \
  frontend/src/features/hints/HintResponseCard.tsx \
  frontend/src/features/diagnosis/DiagnosisCard.tsx \
  frontend/src/features/query-results/QueryResultsTable.tsx \
  frontend/src/features/cozo-sem/CozoSemRenderer.tsx \
  frontend/src/notebook/notebook.css
echo
echo "## Redux hook usage"
rg -n "useAppSelector|useAppDispatch|Provider|makeStore" frontend/src -S
echo
echo "## Existing tests"
rg --files frontend/src | rg "\\.test\\.(ts|tsx)$"
echo
echo "## Existing feature/component directories"
find frontend/src -maxdepth 3 -type d | sort
