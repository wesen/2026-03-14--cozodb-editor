# Tasks

## TODO

- [ ] Add Redux Toolkit and react-redux dependencies
- [ ] Create app store, provider wiring, and typed dispatch/selector hooks
- [ ] Create normalized notebook slice state, reducers, thunks, and selectors
- [ ] Move notebook bootstrap and mutation orchestration out of `useNotebookDocument`
- [ ] Move notebook-wide UI state (`activeCellId`, prompts, collapsed/dismissed threads) into the slice
- [ ] Move SEM projection updates into store-managed actions
- [ ] Refactor `NotebookPage` to dispatch actions and read selectors
- [ ] Simplify `NotebookCellCard` props around store-backed data flow
- [ ] Remove or retire `useNotebookDocument`
- [ ] Add selector/thunk/component tests and document results in the diary
