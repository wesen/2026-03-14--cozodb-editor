# Tasks

## TODO

- [ ] Add backend test coverage for insert/move/delete position invariants under the unique index
- [ ] Implement a safe transactional position rewrite helper in `backend/pkg/notebook/store.go`
- [ ] Refactor insert to use the safe rewrite helper and return authoritative notebook state
- [ ] Refactor move to use the safe rewrite helper and return authoritative notebook state
- [ ] Refactor delete to use the safe rewrite helper and return authoritative notebook state
- [ ] Update notebook service and API handlers for the widened mutation responses
- [ ] Update frontend transport typings and notebook state consumption for authoritative mutation responses
- [ ] Add or update frontend tests covering post-mutation order replacement
- [ ] Run targeted backend/frontend validation and document results in the diary
