#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../../../../../.. && pwd)"
cd "$repo_root"

echo "== date =="
date -Iseconds
echo

echo "== repo =="
pwd
echo

echo "== merge heads =="
git rev-parse --short HEAD
git rev-parse --short MERGE_HEAD
git merge-base HEAD MERGE_HEAD
echo

echo "== status =="
git status --short
echo

echo "== unmerged files =="
git diff --name-only --diff-filter=U
echo

echo "== conflict markers =="
rg -n '^(<<<<<<<|=======|>>>>>>>)' \
  frontend/package-lock.json \
  frontend/src/notebook/NotebookCellCard.tsx \
  frontend/src/notebook/NotebookPage.tsx \
  ttmp/vocabulary.yaml || true
echo

echo "== commits unique to local =="
git log --oneline --decorate "$(git merge-base HEAD MERGE_HEAD)..HEAD"
echo

echo "== commits unique to merge head =="
git log --oneline --decorate "$(git merge-base HEAD MERGE_HEAD)..MERGE_HEAD"
echo

echo "== merge-head diff stat =="
git diff --stat "$(git merge-base HEAD MERGE_HEAD)..MERGE_HEAD"
echo

echo "== notebook-targeted merge-head diff stat =="
git diff --stat "$(git merge-base HEAD MERGE_HEAD)..MERGE_HEAD" -- \
  frontend/package.json \
  frontend/package-lock.json \
  frontend/src/editor \
  frontend/src/notebook \
  ttmp/vocabulary.yaml
