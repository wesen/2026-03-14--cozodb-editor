import { javascript } from "@codemirror/lang-javascript";
import type { NotebookCodeCellEditorProps } from "../notebook/experienceConfig";
import { NotebookCodeMirrorEditor } from "./NotebookCodeMirrorEditor";

export function JavaScriptNotebookEditor(props: NotebookCodeCellEditorProps) {
  return (
    <NotebookCodeMirrorEditor
      {...props}
      extensions={[javascript()]}
    />
  );
}
