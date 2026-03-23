import { CurrentCozoNotebookApp, CurrentJavaScriptNotebookApp, CurrentSQLiteNotebookApp } from "./notebook";

const NOTEBOOK_PRESET = import.meta.env.VITE_NOTEBOOK_PRESET;

function App() {
  if (NOTEBOOK_PRESET === "javascript") {
    return <CurrentJavaScriptNotebookApp />;
  }

  if (NOTEBOOK_PRESET === "sqlite") {
    return <CurrentSQLiteNotebookApp />;
  }

  return <CurrentCozoNotebookApp />;
}

export default App
