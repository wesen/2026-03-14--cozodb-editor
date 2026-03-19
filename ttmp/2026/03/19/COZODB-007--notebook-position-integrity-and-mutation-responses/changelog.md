# Changelog

## 2026-03-19

- Initial workspace created
- Implemented safe notebook position rewrites for insert, move, and delete
- Added backend mutation invariant tests covering dense position ordering
- Widened notebook mutation API responses to return authoritative document payloads
- Updated frontend notebook mutation handling to reconcile server order while preserving dirty local drafts
