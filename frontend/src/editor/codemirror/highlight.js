import { styleTags, tags as t } from "@lezer/highlight";

export const cozoHighlighting = styleTags({
  // Comments
  Comment: t.lineComment,

  // Literals
  NullLiteral: t.null,
  BoolLiteral: t.bool,
  Integer: t.integer,
  Float: t.float,
  "DoubleQuotedString SingleQuotedString": t.string,
  doubleStringContent: t.string,
  singleStringContent: t.string,
  EscapeSequence: t.escape,

  // Keywords
  "not or and in default on none some": t.keyword,
  "_new _old": t.keyword,

  // Special forms
  "try if cond": t.controlKeyword,

  // Operators
  "Assign FixedArrow ConstArrow FatArrow Arrow": t.definitionOperator,
  'ComparisonOp EqualityOp': t.compareOperator,
  'AddOp MulOp Concat': t.arithmeticOperator,

  // Rule structure
  EntryMarker: t.special(t.variableName),
  "RuleName/Identifier": t.definition(t.variableName),
  "StoredRelationApplication/Identifier": t.special(t.variableName),
  // Aggregation operators (extended keywords inside AggregationOp)
  "min max union intersection choice min_cost shortest": t.standard(t.function(t.variableName)),
  "bit_and bit_or count count_unique collect unique": t.standard(t.function(t.variableName)),
  "group_count bit_xor latest_by smallest_by choice_rand": t.standard(t.function(t.variableName)),
  "mean sum product variance std_dev": t.standard(t.function(t.variableName)),
  AlgorithmName: t.standard(t.className),
  "FunctionName/Identifier": t.function(t.variableName),
  Wildcard: t.special(t.variableName),

  // System operations
  ColonColon: t.special(t.keyword),
  "SysRelations/...": t.special(t.keyword),
  "SysColumns/...": t.special(t.keyword),
  "SysRemove/...": t.special(t.keyword),
  "SysRename/...": t.special(t.keyword),
  "SysRunning/...": t.special(t.keyword),
  "SysKill/...": t.special(t.keyword),
  "SysCompact/...": t.special(t.keyword),
  "SysExplain/...": t.special(t.keyword),
  "SysShowTriggers/...": t.special(t.keyword),
  "SysSetTriggers/...": t.special(t.keyword),
  "SysAccessLevel/...": t.special(t.keyword),

  // Query options
  "QueryOptionLimit QueryOptionOffset QueryOptionTimeout QueryOptionSleep": t.keyword,
  "QueryOptionSort QueryOptionOrder QueryOptionAssert": t.keyword,
  "QueryOptionCreate QueryOptionPut QueryOptionRm": t.keyword,
  "QueryOptionEnsure QueryOptionEnsureNot QueryOptionReplace QueryOptionYield": t.keyword,

  // Types
  "Int Float String Bool Bytes Uuid List Validity": t.typeName,
  "ColType/...": t.typeName,

  // Identifiers
  Identifier: t.variableName,

  // Brackets
  '"(" ")"': t.paren,
  '"[" "]"': t.squareBracket,
  '"{" "}"': t.brace,
});
