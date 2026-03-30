#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../../../../../../" && pwd)"
cd "$repo_root"

echo "# Editor surface inventory"
echo
echo "## Preset configs"
rg -n "CodeCellEditor|codeFenceLanguage|appName" frontend/src/notebook/current*Config.ts
echo
echo "## Notebook editor usage"
rg -n "CodeCellEditor|textarea|useNotebookExperience" frontend/src/notebook/NotebookCellCardView.tsx frontend/src/notebook/experienceConfig.ts
echo
echo "## Existing editor files"
rg --files frontend/src/editor
echo
echo "## Frontend package dependencies"
sed -n '1,220p' frontend/package.json
