import { Provider } from "react-redux";
import type { AppStore } from "../app/store";
import type { HintsSocket } from "../transport/hintsSocket";
import { NotebookPageContainer } from "./NotebookPage";
import type { NotebookShellConfig } from "./config";
import { NotebookExperienceProvider } from "./experience";
import type { NotebookExperienceConfig } from "./experienceConfig";
import type { NotebookSemHandlerRegistrar } from "./registerCurrentCozoSemHandlers";

export interface NotebookAppProps {
  confirmAction?: (message: string) => boolean;
  experienceConfig?: Partial<NotebookExperienceConfig>;
  registerSemHandlers?: NotebookSemHandlerRegistrar;
  shellConfig?: Partial<NotebookShellConfig>;
  store: AppStore;
  ws: HintsSocket;
}

export function NotebookApp({
  confirmAction,
  experienceConfig,
  registerSemHandlers,
  shellConfig,
  store,
  ws,
}: NotebookAppProps) {
  return (
    <Provider store={store}>
      <NotebookExperienceProvider value={experienceConfig}>
        <NotebookPageContainer
          confirmAction={confirmAction}
          registerSemHandlers={registerSemHandlers}
          shellConfig={shellConfig}
          ws={ws}
        />
      </NotebookExperienceProvider>
    </Provider>
  );
}
