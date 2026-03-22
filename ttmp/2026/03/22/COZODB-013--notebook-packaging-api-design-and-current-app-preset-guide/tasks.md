# Tasks

## Ticket Deliverables

- [x] Create ticket `COZODB-013`
- [x] Write the packaging and API design guide
- [x] Create the diary
- [x] Create and run a ticket-local package surface inventory script
- [x] Upload the ticket bundle to reMarkable

## Packaging And API Design Backlog

- [ ] Define backend package API around `backend/pkg/notebook` with explicit module/config constructors
- [ ] Define frontend package API around `frontend/src/notebook` with explicit app-shell and transport injection points
- [ ] Introduce a current-app preset on the backend that composes Cozo runtime, SQLite notebook store, and hints engine
- [ ] Introduce a current-app preset on the frontend that composes notebook UI, Mac theme, Redux state, HTTP transport, and hints socket
- [ ] Separate notebook domain contracts from Cozo-specific contracts on both frontend and backend
- [ ] Move transport path/base URL concerns behind explicit preset configuration
- [ ] Move shell- and theme-specific defaults behind explicit preset configuration
- [ ] Add package-level smoke examples for embedding the notebook in another host
- [ ] Design a second backend language surface that exposes JavaScript execution as a first-class notebook runtime
- [ ] Design a second frontend language surface that exposes JavaScript-oriented renderers, docs, and prompt defaults
- [ ] Define test strategy for preset compatibility across Cozo and JavaScript surfaces
