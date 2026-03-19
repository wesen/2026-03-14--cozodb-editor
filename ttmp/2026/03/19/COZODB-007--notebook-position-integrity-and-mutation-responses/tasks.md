# Tasks

## TODO

- [x] Add backend test coverage for insert/move/delete position invariants under the unique index
- [x] Implement a safe transactional position rewrite helper in `backend/pkg/notebook/store.go`
- [x] Refactor insert to use the safe rewrite helper and return authoritative notebook state
- [x] Refactor move to use the safe rewrite helper and return authoritative notebook state
- [x] Refactor delete to use the safe rewrite helper and return authoritative notebook state
- [x] Update notebook service and API handlers for the widened mutation responses
- [x] Update frontend transport typings and notebook state consumption for authoritative mutation responses
- [x] Add or update frontend tests covering post-mutation order replacement
- [x] Run targeted backend/frontend validation and document results in the diary
