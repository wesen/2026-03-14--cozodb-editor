import type { NotebookCodeCellEditorProps } from "../notebook/experienceConfig";
import { cozoLanguage, cozoCompletions } from "./codemirror/index.js";
import { NotebookCodeMirrorEditor } from "./NotebookCodeMirrorEditor";

export function CozoScriptEditor(props: NotebookCodeCellEditorProps) {
  return (
    <NotebookCodeMirrorEditor
      {...props}
      extensions={[
        cozoLanguage,
        cozoLanguage.data.of({ autocomplete: cozoCompletions }),
      ]}
    />
  );
}
