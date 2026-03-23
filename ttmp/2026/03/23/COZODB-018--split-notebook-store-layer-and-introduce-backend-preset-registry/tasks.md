# Tasks

## TODO

- [x] Record baseline backend validation and inventory before moving code
- [x] Split `backend/pkg/notebook/store.go` into responsibility-oriented files while preserving the `Store` API
- [x] Re-run backend tests after the store split and fix any movement-only regressions
- [ ] Introduce backend preset registry types and default registrations for Cozo, JavaScript, and SQLite
- [ ] Rewire `backend/main.go` to use the preset registry and normalized preset options
- [ ] Re-run backend tests and manual preset startup validation after registry integration
- [ ] Update the diary, changelog, and ticket status with implementation notes and validation results
