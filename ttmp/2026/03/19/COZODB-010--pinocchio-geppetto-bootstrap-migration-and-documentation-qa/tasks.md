# Tasks

## TODO

- [ ] If JS profile APIs are exposed, pass `resolved.FinalInferenceSettings` into runtime defaults before engine creation.

## Completed

- [x] Create ticket `COZODB-010` in the CozoDB editor `ttmp` workspace.
- [x] Add a tutorial-driven design doc for the migration.
- [x] Start a detailed diary that records lookups, blockers, and clarity issues.
- [x] Identify the current migration seam as the embedded hints-engine bootstrap in `backend/pkg/hints/engine.go` and `backend/main.go`, not a Cobra verb.
- [x] Inventory the current target enough to confirm that it is a server bootstrap path driven by environment variables rather than a Glazed or Cobra command surface.
- [x] Remove the first stale Geppetto API usage by replacing `NewStepSettings` and `NewEngineFromStepSettings` with the current `InferenceSettings` and `NewEngineFromSettings` helpers.
- [x] Adapt the tutorial’s CLI bootstrap model into a server-friendly Glazed command for the backend entrypoint.
- [x] Replace direct environment-to-engine wiring with profile/bootstrap-resolved `InferenceSettings` feeding the hints engine.
- [x] Adopt Pinocchio profile/bootstrap resolution through shared Geppetto sections plus `profilebootstrap.ResolveCLIEngineSettings(...)`.
- [x] Add support for `--print-parsed-fields`, `--print-inference-settings`, and `--print-inference-settings-sources` on the backend command.
- [x] Narrow the backend command surface so only server flags plus `profile` and `profile-registries` remain visible.
- [x] Move bootstrap ownership to an application-owned `cozodb-editor` config/env namespace while still reusing the Pinocchio config mapper and Geppetto base sections.
- [x] Use `gpt-5-mini` as the implicit application profile when registries are configured, without breaking base-only startup.
- [x] Record a documentation QA pass covering unclear target selection, missing escalation guidance, hidden-versus-visible section boundaries, and real config-mapper requirements.
- [x] Run the translated validation checklist as far as the local environment allows:
  - `go build ./...`
  - `go test ./... -count=1`
  - `go run . --help`
  - `go run . --profile analyst`
  - `go run .`
