import { useCallback, useRef, useState } from "react";
import { insertLinesAfter, updateLine } from "./documentCommands";

export function usePadDocument({ onInteract, onQuestion } = {}) {
  const [lines, setLines] = useState([""]);
  const [cursorLine, setCursorLine] = useState(0);
  const inputRef = useRef(null);
  const editorRef = useRef(null);

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const currentLine = lines[cursorLine] || "";
    const questionMatch = currentLine.match(/^#\?\?\s+(.+)/);

    setLines(insertLinesAfter(lines, cursorLine, [""]));

    if (questionMatch) {
      onQuestion?.(questionMatch[1].trim(), cursorLine);
      onInteract?.();
    }

    setCursorLine(cursorLine + 1);
    focusInput();
  }, [cursorLine, focusInput, lines, onInteract, onQuestion]);

  const handleLineChange = useCallback((value) => {
    setLines(updateLine(lines, cursorLine, value));
    if (value.length > 0) {
      onInteract?.();
    }
  }, [cursorLine, lines, onInteract]);

  const selectLine = useCallback((lineIdx) => {
    setCursorLine(lineIdx);
    focusInput();
  }, [focusInput]);

  const insertQuestionBelowCursor = useCallback((question) => {
    const insertAt = cursorLine + 1;

    setLines(insertLinesAfter(lines, cursorLine, [`#?? ${question}`, ""]));
    setCursorLine(insertAt + 1);

    onQuestion?.(question, insertAt);
    onInteract?.();
    focusInput();
  }, [cursorLine, focusInput, lines, onInteract, onQuestion]);

  const insertCodeBelowCursor = useCallback((code) => {
    const insertAt = cursorLine + 1;
    const codeLines = code.split("\n");

    setLines(insertLinesAfter(lines, cursorLine, codeLines));
    setCursorLine(insertAt + codeLines.length - 1);
    focusInput();
  }, [cursorLine, focusInput, lines]);

  const loadExampleQuestion = useCallback((question) => {
    setLines([`#?? ${question}`, ""]);
    setCursorLine(1);
    onQuestion?.(question, 0);
    onInteract?.();
    focusInput();
  }, [focusInput, onInteract, onQuestion]);

  return {
    cursorLine,
    editorRef,
    focusInput,
    handleKeyDown,
    handleLineChange,
    inputRef,
    insertCodeBelowCursor,
    insertQuestionBelowCursor,
    lines,
    loadExampleQuestion,
    selectLine,
  };
}
