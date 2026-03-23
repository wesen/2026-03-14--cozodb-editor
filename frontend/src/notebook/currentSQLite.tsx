import { useState } from "react";
import type { AppStore } from "../app/store";
import { useHintsSocket, type HintsSocket } from "../transport/hintsSocket";
import { NotebookApp } from "./NotebookApp";
import type { NotebookShellConfig } from "./config";
import {
  createCurrentSQLiteNotebookStore,
  currentSQLiteNotebookExperienceConfig,
  currentSQLiteNotebookShellConfig,
} from "./currentSQLiteConfig";
import { registerDefaultNotebookSemHandlers } from "./semHandlers";
import "../index.css";
import "../components/primitives/primitives.css";
import "../theme/cards.css";
import "../theme/layout.css";
import "../theme/tokens.css";
import "./notebook.css";

export interface CurrentSQLiteNotebookAppProps {
  apiBase?: string;
  confirmAction?: (message: string) => boolean;
  shellConfig?: Partial<NotebookShellConfig>;
  store?: AppStore;
  ws?: HintsSocket;
  wsPath?: string;
}

interface CurrentSQLiteNotebookAppBaseProps {
  confirmAction?: (message: string) => boolean;
  shellConfig?: Partial<NotebookShellConfig>;
  store?: AppStore;
  ws: HintsSocket;
}

function CurrentSQLiteNotebookAppBase({
  confirmAction,
  shellConfig,
  store,
  ws,
}: CurrentSQLiteNotebookAppBaseProps) {
  const [resolvedStore] = useState(() => store ?? createCurrentSQLiteNotebookStore());

  return (
    <NotebookApp
      confirmAction={confirmAction}
      experienceConfig={currentSQLiteNotebookExperienceConfig}
      registerSemHandlers={registerDefaultNotebookSemHandlers}
      shellConfig={{ ...currentSQLiteNotebookShellConfig, ...shellConfig }}
      store={resolvedStore}
      ws={ws}
    />
  );
}

function CurrentSQLiteNotebookAppWithLiveSocket({
  apiBase,
  confirmAction,
  shellConfig,
  store,
  wsPath = "/ws/hints",
}: Omit<CurrentSQLiteNotebookAppProps, "ws">) {
  const [resolvedStore] = useState(() => store ?? createCurrentSQLiteNotebookStore({ apiBase }));
  const ws = useHintsSocket(wsPath);

  return (
    <CurrentSQLiteNotebookAppBase
      confirmAction={confirmAction}
      shellConfig={shellConfig}
      store={resolvedStore}
      ws={ws}
    />
  );
}

export function CurrentSQLiteNotebookApp(props: CurrentSQLiteNotebookAppProps) {
  if (props.ws) {
    return (
      <CurrentSQLiteNotebookAppBase
        confirmAction={props.confirmAction}
        shellConfig={props.shellConfig}
        store={props.store}
        ws={props.ws}
      />
    );
  }

  return (
    <CurrentSQLiteNotebookAppWithLiveSocket
      apiBase={props.apiBase}
      confirmAction={props.confirmAction}
      shellConfig={props.shellConfig}
      store={props.store}
      wsPath={props.wsPath}
    />
  );
}
