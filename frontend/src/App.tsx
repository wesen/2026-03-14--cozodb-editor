import { CurrentCozoNotebookApp, CurrentJavaScriptNotebookApp } from "./notebook";

const NOTEBOOK_PRESET = import.meta.env.VITE_NOTEBOOK_PRESET;

function App() {
  if (NOTEBOOK_PRESET === "javascript") {
    return <CurrentJavaScriptNotebookApp />;
  }

  return <CurrentCozoNotebookApp />;
}

export default App
