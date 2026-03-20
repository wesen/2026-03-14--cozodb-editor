import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

// ── System 7 palette ──────────────────────────────────
const s7 = {
  purple: "#6a1b9a",
  steelBlue: "#005599",
  navy: "#0d47a1",
  mediumBlue: "#1565c0",
  teal: "#00695c",
  green: "#2e7d32",
  gold: "#bf6900",
  orange: "#e65100",
  red: "#c62828",
  black: "#000000",
  darkGray: "#333333",
  mediumGray: "#666666",
  gray: "#888888",
  lightGray: "#999999",
  bgCode: "#f5f5f0",
  bgGutter: "#ebebeb",
  bgActive: "#e8e8e0",
  bgSelection: "#bbd6f7",
  white: "#ffffff",
};

// ── Editor chrome ─────────────────────────────────────
export const system7EditorTheme = EditorView.theme(
  {
    "&": {
      color: s7.black,
      backgroundColor: s7.bgCode,
      fontSize: "13px",
    },
    ".cm-content": {
      caretColor: s7.black,
      fontFamily: "'IBM Plex Mono', monospace",
      padding: "8px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: s7.black,
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: s7.bgSelection,
      },
    ".cm-gutters": {
      backgroundColor: s7.bgGutter,
      color: s7.lightGray,
      border: "none",
      borderRight: "1px solid #cccccc",
    },
    ".cm-activeLineGutter": {
      backgroundColor: s7.bgActive,
      color: s7.darkGray,
    },
    ".cm-activeLine": {
      backgroundColor: s7.bgActive,
    },
    ".cm-tooltip": {
      backgroundColor: s7.white,
      color: s7.black,
      border: "1px solid #000",
      boxShadow: "2px 2px 0px #000",
      borderRadius: "0px",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li": {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "12px",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: s7.black,
        color: s7.white,
      },
    },
    ".cm-completionLabel": { color: s7.black },
    ".cm-completionDetail": { color: s7.mediumGray, fontStyle: "italic" },
    ".cm-completionMatchedText": {
      textDecoration: "none",
      fontWeight: "bold",
    },
    ".cm-panels": {
      backgroundColor: s7.bgGutter,
      color: s7.black,
      borderTop: "1px solid #000",
    },
    ".cm-searchMatch": {
      backgroundColor: "#fff59d",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "#fff176",
      outline: "1px solid #000",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: s7.bgGutter,
      color: s7.mediumGray,
      border: "1px solid #999",
    },
  },
  { dark: false },
);

// ── Syntax highlighting ───────────────────────────────
export const system7HighlightStyle = HighlightStyle.define([
  // Keywords
  { tag: t.keyword, color: s7.purple, fontWeight: "bold" },
  { tag: t.controlKeyword, color: s7.purple, fontWeight: "bold" },

  // Operators
  { tag: t.definitionOperator, color: s7.steelBlue },
  { tag: t.compareOperator, color: s7.darkGray },
  { tag: t.arithmeticOperator, color: s7.darkGray },

  // Literals
  { tag: t.null, color: s7.red },
  { tag: t.bool, color: s7.orange },
  { tag: t.integer, color: s7.mediumBlue },
  { tag: t.float, color: s7.mediumBlue },
  { tag: t.string, color: s7.green },
  { tag: t.escape, color: s7.teal },

  // Names
  { tag: t.definition(t.variableName), color: s7.navy, fontWeight: "bold" },
  { tag: t.function(t.variableName), color: s7.teal },
  { tag: t.special(t.variableName), color: s7.red, fontWeight: "bold" },
  { tag: t.standard(t.function(t.variableName)), color: s7.gold },
  { tag: t.standard(t.className), color: s7.gold, fontWeight: "bold" },
  { tag: t.variableName, color: s7.black },
  { tag: t.typeName, color: s7.purple },

  // System ops
  { tag: t.special(t.keyword), color: s7.red, fontWeight: "bold" },

  // Comments
  { tag: t.lineComment, color: s7.gray, fontStyle: "italic" },

  // Errors
  { tag: t.invalid, color: s7.white, backgroundColor: s7.red },

  // Brackets
  { tag: t.paren, color: s7.mediumGray },
  { tag: t.squareBracket, color: s7.mediumGray },
  { tag: t.brace, color: s7.mediumGray },
]);
