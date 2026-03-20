import { parser } from "./parser.js";
import {
  LRLanguage,
  indentNodeProp,
  foldNodeProp,
  foldInside,
} from "@codemirror/language";
import { cozoHighlighting } from "./highlight.js";

export const cozoLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      cozoHighlighting,
      indentNodeProp.add({
        BracedQuery: (cx) => cx.baseIndent + cx.unit,
        ListLiteral: (cx) => cx.baseIndent + cx.unit,
        RelationSpec: (cx) => cx.baseIndent + cx.unit,
        FixedRuleBody: (cx) => cx.baseIndent + cx.unit,
        ArgList: (cx) => cx.baseIndent + cx.unit,
      }),
      foldNodeProp.add({
        BracedQuery: foldInside,
        ListLiteral: foldInside,
        RelationSpec: foldInside,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: "#" },
    closeBrackets: { brackets: ["(", "[", "{", '"', "'"] },
  },
});

export { cozoCompletions } from "./complete.js";
export { cozoHighlighting } from "./highlight.js";
