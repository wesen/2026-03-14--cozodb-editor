# Tasks

## TODO

- [x] Add Redux Toolkit and react-redux dependencies
- [x] Create app store, provider wiring, and typed dispatch/selector hooks
- [x] Create normalized notebook slice state, reducers, thunks, and selectors
- [x] Move notebook bootstrap and mutation orchestration out of `useNotebookDocument`
- [x] Move notebook-wide UI state (`activeCellId`, prompts, collapsed/dismissed threads) into the slice
- [x] Move SEM projection updates into store-managed actions
- [x] Refactor `NotebookPage` to dispatch actions and read selectors
- [x] Simplify `NotebookCellCard` props around store-backed data flow
- [x] Remove or retire `useNotebookDocument`
- [x] Add selector/thunk/component tests and document results in the diary
