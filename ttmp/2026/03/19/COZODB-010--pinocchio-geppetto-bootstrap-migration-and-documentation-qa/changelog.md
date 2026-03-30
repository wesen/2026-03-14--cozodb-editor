# Changelog

## 2026-03-19

- Initial workspace created


## 2026-03-19

Created a tutorial-driven ticket, design doc, task list, and diary for the Pinocchio/Geppetto bootstrap migration and documentation QA pass.

### Related Files

- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/pinocchio/pkg/doc/tutorials/07-migrating-cli-verbs-to-glazed-profile-bootstrap.md — Primary source used to derive the migration plan


## 2026-03-19

Started implementation by locating the real backend hints-engine bootstrap seam, replacing removed Geppetto engine-construction APIs, and validating the pkg/hints slice.

### Related Files

- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/main.go — Confirmed the old bootstrap path is server-side and environment-driven
- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/pkg/hints/engine.go — Replaced removed NewStepSettings/NewEngineFromStepSettings usage with current InferenceSettings/NewEngineFromSettings helpers

## 2026-03-19

Added pkg/hints regression tests for the updated hints engine constructor path after replacing the removed Geppetto setup helpers.

### Related Files

- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/pkg/hints/engine.go — Production constructor path exercised by the new tests
- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/pkg/hints/engine_test.go — Package-level regression coverage for constructor drift


## 2026-03-19

Ported the backend entrypoint to a Glazed command backed by Pinocchio profile/bootstrap, switched the hints engine to resolved InferenceSettings, and added secret redaction for inference debug output.

### Related Files

- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/main.go — Glazed command
- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/pkg/api/websocket.go — Fallback messaging no longer refers to Anthropic-only setup
- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/pkg/hints/engine.go — Hints engine constructor now accepts resolved InferenceSettings
- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/pkg/hints/engine_test.go — Regression coverage for the updated constructor path

## 2026-03-19

Narrowed the backend CLI to server flags plus profile selection, moved bootstrap ownership to the app-level `cozodb-editor` namespace, and implemented `gpt-5-mini` as an implicit application profile only when registries are configured.

### Related Files

- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/main.go — Final app-owned bootstrap wiring with lean visible flags and preserved Pinocchio config mapper
- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/main_test.go — Regression coverage for the lean CLI surface and implicit application profile behavior

## 2026-03-19

Defaulted profile registries to `~/.config/pinocchio/profiles.yaml` when present so explicit `--profile` selection works without passing `--profile-registries` every time.

### Related Files

- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/main.go — Profile section now defaults registries to the Pinocchio profiles file when present
- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/main_test.go — Regression coverage for the default Pinocchio profiles registry behavior

## 2026-03-19

Reintroduced `--print-inference-settings` plus `--print-inference-settings-source` on the lean backend CLI and restored redacted inference/provenance debug output.

### Related Files

- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/main.go — Local debug section and redacted inference/provenance exits
- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/main_test.go — CLI-surface regression coverage for the debug flags

## 2026-03-20

Replaced the backend’s local inference-debug section, trace reconstruction, and redaction helpers with the shared `geppetto/pkg/cli/bootstrap` helper. The backend now exposes only `--print-inference-settings`, prints combined `settings` and `sources`, and masks sensitive values as `***`.

### Related Files

- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/main.go — Shared Geppetto inference debug helper now owns the debug surface and output path
- /home/manuel/workspaces/2026-03-17/add-opinionated-apis/2026-03-14--cozodb-editor/backend/main_test.go — CLI-surface assertions updated to the single debug flag
