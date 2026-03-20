import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  placeholder as cmPlaceholder,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from "@codemirror/language";
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
} from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";

import { cozoLanguage, cozoCompletions } from "./codemirror/index.js";
import {
  system7EditorTheme,
  system7HighlightStyle,
} from "./cozoscriptSystem7Theme";

interface CozoScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  onRunAndInsert?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CozoScriptEditor({
  value,
  onChange,
  onRun,
  onRunAndInsert,
  onBlur,
  onFocus,
  placeholder,
  autoFocus,
}: CozoScriptEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const updatingFromProps = useRef(false);

  // Stable refs for callbacks so we don't recreate the editor on every render
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

  // ── Mount CodeMirror ────────────────────────────────
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

        // Keymaps: cell-specific first, then defaults
        cellKeymap,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
        ]),

        // CozoScript language (grammar + autocomplete)
        cozoLanguage,
        cozoLanguage.data.of({ autocomplete: cozoCompletions }),

        // System 7 theme
        syntaxHighlighting(system7HighlightStyle),
        system7EditorTheme,

        // Placeholder
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),

        // State bridge: CM → React/Redux
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !updatingFromProps.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),

        // Blur/Focus handlers
        EditorView.domEventHandlers({
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

  // ── Sync Redux → CodeMirror (external updates only) ─
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

  // ── Focus when cell becomes active ──────────────────
  useEffect(() => {
    if (autoFocus && viewRef.current) {
      viewRef.current.focus();
    }
  }, [autoFocus]);

  return <div ref={containerRef} className="mac-codemirror-container" />;
}
