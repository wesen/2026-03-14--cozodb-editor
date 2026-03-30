# Tasks

## Ticket Deliverables

- [x] Create ticket `COZODB-013`
- [x] Write the packaging and API design guide
- [x] Create the diary
- [x] Create and run a ticket-local package surface inventory script
- [x] Upload the ticket bundle to reMarkable

## Packaging And API Design Backlog

- [x] Define backend package API around `backend/pkg/notebook` with explicit module/config constructors
- [x] Move backend notebook route paths behind explicit base-path configuration
- [x] Introduce a current-app preset on the backend that composes Cozo runtime, SQLite notebook store, and hints engine
- [x] Define frontend package API around `frontend/src/notebook` with explicit app-shell and transport injection points
- [x] Introduce a current-app preset on the frontend that composes notebook UI, Mac theme, Redux state, HTTP transport, and hints socket
- [x] Separate notebook domain contracts from Cozo-specific contracts on both frontend and backend
- [x] Move frontend transport path/base URL concerns behind explicit preset configuration
- [x] Move shell- and theme-specific defaults behind explicit preset configuration
- [x] Add package-level smoke examples for embedding the notebook in another host
- [x] Design a second backend language surface that exposes JavaScript execution as a first-class notebook runtime
- [x] Design a second frontend language surface that exposes JavaScript-oriented renderers, docs, and prompt defaults
- [x] Define test strategy for preset compatibility across Cozo and JavaScript surfaces
