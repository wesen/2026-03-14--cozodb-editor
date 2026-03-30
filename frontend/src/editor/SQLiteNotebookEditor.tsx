import { sql, SQLite } from "@codemirror/lang-sql";
import type { NotebookCodeCellEditorProps } from "../notebook/experienceConfig";
import { NotebookCodeMirrorEditor } from "./NotebookCodeMirrorEditor";

export function SQLiteNotebookEditor(props: NotebookCodeCellEditorProps) {
  return (
    <NotebookCodeMirrorEditor
      {...props}
      extensions={[sql({ dialect: SQLite })]}
    />
  );
}
