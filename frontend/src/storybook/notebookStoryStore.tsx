import { type ReactNode, useMemo } from "react";
import { Provider } from "react-redux";
import { createNotebookStoryStore, type NotebookStoryStateOptions } from "./createNotebookStoryStore";

interface NotebookStoryProviderProps {
  children: ReactNode;
  options: NotebookStoryStateOptions;
}

export function NotebookStoryProvider({ children, options }: NotebookStoryProviderProps) {
  const store = useMemo(() => createNotebookStoryStore(options), [options]);
  return <Provider store={store}>{children}</Provider>;
}
