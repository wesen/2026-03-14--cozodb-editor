#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/manuel/code/wesen/2026-03-14--cozodb-editor"
GOJA_ROOT="/home/manuel/code/wesen/corporate-headquarters/go-go-goja"

echo "# JavaScript Preset Inventory"
echo
echo "## Current notebook preset files"
rg -n "OpenCurrentCozoModule|currentCozo|NotebookExperienceConfig|NotebookProfile|WebSocketConfig" \
  "$ROOT/backend" "$ROOT/frontend" | sed "s#^$ROOT/##"
echo
echo "## go-go-goja engine files"
rg --files "$GOJA_ROOT" | rg "/engine/|/modules/|pkg/repl/evaluators/javascript/"
echo
echo "## Runtime interface references"
rg -n "type Runtime interface|Query\\(|ListRelations\\(|DescribeRelation\\(|GetSchema\\(|Reset\\(" \
  "$ROOT/backend/pkg/notebook" "$ROOT/backend/pkg/cozo"
