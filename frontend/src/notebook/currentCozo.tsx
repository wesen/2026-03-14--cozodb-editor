import { useState } from "react";
import type { AppStore } from "../app/store";
import { useHintsSocket, type HintsSocket } from "../transport/hintsSocket";
import { NotebookApp } from "./NotebookApp";
import type { NotebookShellConfig } from "./config";
import {
  createCurrentCozoNotebookStore,
  currentCozoNotebookExperienceConfig,
  currentCozoNotebookShellConfig,
} from "./currentCozoConfig";
import { registerCurrentCozoSemHandlers } from "./registerCurrentCozoSemHandlers";
import "../index.css";
import "../components/primitives/primitives.css";
import "../theme/cards.css";
import "../theme/layout.css";
import "../theme/tokens.css";
import "./notebook.css";

export interface CurrentCozoNotebookAppProps {
  apiBase?: string;
  confirmAction?: (message: string) => boolean;
  shellConfig?: Partial<NotebookShellConfig>;
  store?: AppStore;
  ws?: HintsSocket;
  wsPath?: string;
}

interface CurrentCozoNotebookAppBaseProps {
  confirmAction?: (message: string) => boolean;
  shellConfig?: Partial<NotebookShellConfig>;
  store?: AppStore;
  ws: HintsSocket;
}

function CurrentCozoNotebookAppBase({
  confirmAction,
  shellConfig,
  store,
  ws,
}: CurrentCozoNotebookAppBaseProps) {
  const [resolvedStore] = useState(() => store ?? createCurrentCozoNotebookStore());

  return (
    <NotebookApp
      confirmAction={confirmAction}
      experienceConfig={currentCozoNotebookExperienceConfig}
      registerSemHandlers={registerCurrentCozoSemHandlers}
      shellConfig={{ ...currentCozoNotebookShellConfig, ...shellConfig }}
      store={resolvedStore}
      ws={ws}
    />
  );
}

function CurrentCozoNotebookAppWithLiveSocket({
  apiBase,
  confirmAction,
  shellConfig,
  store,
  wsPath = "/ws/hints",
}: Omit<CurrentCozoNotebookAppProps, "ws">) {
  const [resolvedStore] = useState(() => store ?? createCurrentCozoNotebookStore({ apiBase }));
  const ws = useHintsSocket(wsPath);

  return (
    <CurrentCozoNotebookAppBase
      confirmAction={confirmAction}
      shellConfig={shellConfig}
      store={resolvedStore}
      ws={ws}
    />
  );
}

export function CurrentCozoNotebookApp(props: CurrentCozoNotebookAppProps) {
  if (props.ws) {
    return (
      <CurrentCozoNotebookAppBase
        confirmAction={props.confirmAction}
        shellConfig={props.shellConfig}
        store={props.store}
        ws={props.ws}
      />
    );
  }

  return (
    <CurrentCozoNotebookAppWithLiveSocket
      apiBase={props.apiBase}
      confirmAction={props.confirmAction}
      shellConfig={props.shellConfig}
      store={props.store}
      wsPath={props.wsPath}
    />
  );
}
