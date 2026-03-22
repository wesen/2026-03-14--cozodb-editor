import { configureStore, type ThunkAction, type UnknownAction } from "@reduxjs/toolkit";
import { notebookReducer } from "../notebook/state/notebookSlice";
import { createHTTPNotebookTransport, type NotebookTransport } from "../transport/httpClient";

export interface AppServices {
  notebookTransport: NotebookTransport;
}

interface MakeStoreOptions {
  services?: Partial<AppServices>;
}

export function makeStore({ services }: MakeStoreOptions = {}) {
  const resolvedServices: AppServices = {
    notebookTransport: services?.notebookTransport ?? createHTTPNotebookTransport(),
  };

  return configureStore({
    reducer: {
      notebook: notebookReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      thunk: {
        extraArgument: resolvedServices,
      },
    }),
  });
}

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, AppServices, UnknownAction>;
