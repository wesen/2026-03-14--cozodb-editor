import { useEffect, useRef } from "react";
import type { Extension } from "@codemirror/state";
import { EditorState } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import type { NotebookCodeCellEditorProps } from "../notebook/experienceConfig";
import {
  notebookCodeMirrorHighlightStyle,
  notebookCodeMirrorTheme,
} from "./notebookCodeMirrorTheme";

export interface NotebookCodeMirrorEditorProps
  extends NotebookCodeCellEditorProps {
  extensions?: Extension[];
}

export function NotebookCodeMirrorEditor({
  autoFocus,
  extensions = [],
  onBlur,
  onChange,
  onFocus,
  onRun,
  onRunAndInsert,
  placeholder,
  value,
}: NotebookCodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const updatingFromProps = useRef(false);

  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const onRunAndInsertRef = useRef(onRunAndInsert);
  const onBlurRef = useRef(onBlur);
  const onFocusRef = useRef(onFocus);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);
  useEffect(() => {
    onRunAndInsertRef.current = onRunAndInsert;
  }, [onRunAndInsert]);
  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  useEffect(() => {
    if (!containerRef.current) return;

    const cellKeymap = keymap.of([
      {
        key: "Shift-Enter",
        run: () => {
          onRunRef.current?.();
          return true;
        },
      },
      {
        key: "Alt-Enter",
        run: () => {
          onRunAndInsertRef.current?.();
          return true;
        },
      },
      {
        key: "Ctrl-Enter",
        run: () => {
          onRunAndInsertRef.current?.();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        history(),
        bracketMatching(),
        closeBrackets(),
        foldGutter(),
        highlightSelectionMatches(),
        autocompletion(),
        cellKeymap,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
        ]),
        syntaxHighlighting(notebookCodeMirrorHighlightStyle),
        notebookCodeMirrorTheme,
        ...extensions,
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !updatingFromProps.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
          keydown: (event) => {
            if (
              event.key === "Enter" &&
              (event.shiftKey || event.altKey || event.ctrlKey)
            ) {
              event.stopPropagation();
            }
          },
          blur: () => {
            onBlurRef.current?.();
          },
          focus: () => {
            onFocusRef.current?.();
          },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    if (autoFocus) {
      view.focus();
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount once

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      updatingFromProps.current = true;
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
      updatingFromProps.current = false;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && viewRef.current) {
      viewRef.current.focus();
    }
  }, [autoFocus]);

  return <div ref={containerRef} className="mac-codemirror-container" />;
}
