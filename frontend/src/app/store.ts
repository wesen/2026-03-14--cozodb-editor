import { configureStore, type ThunkAction, type UnknownAction } from "@reduxjs/toolkit";
import { notebookReducer } from "../notebook/state/notebookSlice";

export function makeStore() {
  return configureStore({
    reducer: {
      notebook: notebookReducer,
    },
  });
}

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, UnknownAction>;
