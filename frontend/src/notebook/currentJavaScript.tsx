import { useState } from "react";
import type { AppStore } from "../app/store";
import { useHintsSocket, type HintsSocket } from "../transport/hintsSocket";
import { NotebookApp } from "./NotebookApp";
import type { NotebookShellConfig } from "./config";
import {
  createCurrentJavaScriptNotebookStore,
  currentJavaScriptNotebookExperienceConfig,
  currentJavaScriptNotebookShellConfig,
} from "./currentJavaScriptConfig";
import { registerDefaultNotebookSemHandlers } from "./semHandlers";
import "../index.css";
import "../components/primitives/primitives.css";
import "../theme/cards.css";
import "../theme/layout.css";
import "../theme/tokens.css";
import "./notebook.css";

export interface CurrentJavaScriptNotebookAppProps {
  apiBase?: string;
  confirmAction?: (message: string) => boolean;
  shellConfig?: Partial<NotebookShellConfig>;
  store?: AppStore;
  ws?: HintsSocket;
  wsPath?: string;
}

interface CurrentJavaScriptNotebookAppBaseProps {
  confirmAction?: (message: string) => boolean;
  shellConfig?: Partial<NotebookShellConfig>;
  store?: AppStore;
  ws: HintsSocket;
}

function CurrentJavaScriptNotebookAppBase({
  confirmAction,
  shellConfig,
  store,
  ws,
}: CurrentJavaScriptNotebookAppBaseProps) {
  const [resolvedStore] = useState(() => store ?? createCurrentJavaScriptNotebookStore());

  return (
    <NotebookApp
      confirmAction={confirmAction}
      experienceConfig={currentJavaScriptNotebookExperienceConfig}
      registerSemHandlers={registerDefaultNotebookSemHandlers}
      shellConfig={{ ...currentJavaScriptNotebookShellConfig, ...shellConfig }}
      store={resolvedStore}
      ws={ws}
    />
  );
}

function CurrentJavaScriptNotebookAppWithLiveSocket({
  apiBase,
  confirmAction,
  shellConfig,
  store,
  wsPath = "/ws/hints",
}: Omit<CurrentJavaScriptNotebookAppProps, "ws">) {
  const [resolvedStore] = useState(() => store ?? createCurrentJavaScriptNotebookStore({ apiBase }));
  const ws = useHintsSocket(wsPath);

  return (
    <CurrentJavaScriptNotebookAppBase
      confirmAction={confirmAction}
      shellConfig={shellConfig}
      store={resolvedStore}
      ws={ws}
    />
  );
}

export function CurrentJavaScriptNotebookApp(props: CurrentJavaScriptNotebookAppProps) {
  if (props.ws) {
    return (
      <CurrentJavaScriptNotebookAppBase
        confirmAction={props.confirmAction}
        shellConfig={props.shellConfig}
        store={props.store}
        ws={props.ws}
      />
    );
  }

  return (
    <CurrentJavaScriptNotebookAppWithLiveSocket
      apiBase={props.apiBase}
      confirmAction={props.confirmAction}
      shellConfig={props.shellConfig}
      store={props.store}
      wsPath={props.wsPath}
    />
  );
}
