import { Provider } from "react-redux";
import type { AppStore } from "../app/store";
import type { HintsSocket } from "../transport/hintsSocket";
import { NotebookPageContainer } from "./NotebookPage";
import type { NotebookShellConfig } from "./config";
import type { NotebookSemHandlerRegistrar } from "./registerCurrentCozoSemHandlers";

export interface NotebookAppProps {
  confirmAction?: (message: string) => boolean;
  registerSemHandlers?: NotebookSemHandlerRegistrar;
  shellConfig?: Partial<NotebookShellConfig>;
  store: AppStore;
  ws: HintsSocket;
}

export function NotebookApp({
  confirmAction,
  registerSemHandlers,
  shellConfig,
  store,
  ws,
}: NotebookAppProps) {
  return (
    <Provider store={store}>
      <NotebookPageContainer
        confirmAction={confirmAction}
        registerSemHandlers={registerSemHandlers}
        shellConfig={shellConfig}
        ws={ws}
      />
    </Provider>
  );
}
