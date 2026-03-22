# Tasks

## Analysis And Setup

- [x] Create ticket `COZODB-012`
- [x] Write the backend cutover implementation guide
- [x] Create the diary
- [x] Create and run a ticket-local backend coupling inventory script

## Ordered Implementation Tasks

- [x] Introduce notebook-local runtime and timeline interfaces plus config-based service construction
- [x] Adapt notebook service tests to the new constructor path
- [ ] Add notebook-owned REST route mounting
- [ ] Rewire `backend/main.go` to notebook-owned REST route mounting
- [ ] Remove old notebook REST handler usage from `backend/pkg/api`
- [ ] Add notebook-local AI/WebSocket interfaces and notebook-owned SEM sink
- [ ] Add notebook-owned WebSocket route mounting
- [ ] Rewire `backend/main.go` to notebook-owned WebSocket route mounting
- [ ] Remove old notebook WebSocket handler usage from `backend/pkg/api`
- [x] Run backend tests
- [ ] Run frontend build/tests against the cutover backend
- [ ] Reassess readiness for the broader package extraction work in `COZODB-010`
