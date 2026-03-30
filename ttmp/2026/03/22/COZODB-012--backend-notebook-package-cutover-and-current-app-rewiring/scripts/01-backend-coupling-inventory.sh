#!/usr/bin/env bash
set -euo pipefail

echo "== main.go notebook wiring =="
rg -n "notebook|WSHandler|HandleNotebook|HandleBootstrapNotebook|HandleResetKernel|/ws/hints|/api/notebook" backend/main.go

echo
echo "== notebook service concrete deps =="
rg -n "chatstore|cozo\\.Manager|OpenService|NewSQLiteTimelineStore|SQLiteTimelineDSNForFile" backend/pkg/notebook/service.go

echo
echo "== api package notebook/http coupling =="
rg -n "Notebook|HandleBootstrapNotebook|HandleNotebook|HandleNotebookCell|HandleResetKernel" backend/pkg/api

echo
echo "== websocket concrete deps =="
rg -n "hints\\.Engine|cozo\\.Manager|HandleWS|handleHintRequest|handleDiagnosisRequest" backend/pkg/api/websocket.go backend/pkg/api/ws_sem_sink.go
