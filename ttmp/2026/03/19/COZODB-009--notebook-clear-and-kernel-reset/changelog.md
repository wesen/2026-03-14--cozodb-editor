# Changelog

## 2026-03-19

- Initial workspace created
- Added a resettable Cozo runtime manager and threaded it through HTTP, websocket, and notebook execution paths
- Added `POST /api/notebooks/{id}/clear` and `POST /api/runtime/reset-kernel`
- Added notebook-store/service support for clearing notebook source and invalidating persisted runtime metadata
- Added Redux slice thunks and confirmed toolbar actions for clear notebook and reset kernel
- Added backend and frontend tests covering clear/reset behavior
