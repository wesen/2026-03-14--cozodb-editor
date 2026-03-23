import { syntaxTree } from "@codemirror/language";

// ── Completion Data ─────────────────────────────────

const SYSTEM_OPS = [
  { label: "::relations", type: "keyword", detail: "List all stored relations" },
  { label: "::columns", type: "keyword", detail: "List columns of a relation" },
  { label: "::remove", type: "keyword", detail: "Remove stored relations" },
  { label: "::rename", type: "keyword", detail: "Rename a stored relation" },
  { label: "::show_triggers", type: "keyword", detail: "Show triggers for a relation" },
  { label: "::set_triggers", type: "keyword", detail: "Set triggers for a relation" },
  { label: "::access_level", type: "keyword", detail: "Set access level" },
  { label: "::running", type: "keyword", detail: "Show running queries" },
  { label: "::kill", type: "keyword", detail: "Kill a running query" },
  { label: "::compact", type: "keyword", detail: "Run compaction" },
  { label: "::explain", type: "keyword", detail: "Explain query plan" },
];

const QUERY_OPTIONS = [
  { label: ":limit", type: "keyword", detail: "Limit output to N rows" },
  { label: ":offset", type: "keyword", detail: "Skip first N rows" },
  { label: ":timeout", type: "keyword", detail: "Abort after N seconds" },
  { label: ":sleep", type: "keyword", detail: "Wait N seconds after completion" },
  { label: ":sort", type: "keyword", detail: "Sort output by columns" },
  { label: ":order", type: "keyword", detail: "Alias for :sort" },
  { label: ":assert", type: "keyword", detail: "Assert none/some rows exist" },
  { label: ":create", type: "keyword", detail: "Create a stored relation" },
  { label: ":put", type: "keyword", detail: "Insert/upsert rows" },
  { label: ":rm", type: "keyword", detail: "Remove rows" },
  { label: ":ensure", type: "keyword", detail: "Ensure rows exist" },
  { label: ":ensure_not", type: "keyword", detail: "Ensure rows do not exist" },
  { label: ":replace", type: "keyword", detail: "Replace all rows" },
  { label: ":yield", type: "keyword", detail: "Yield result for chaining" },
];

const AGGREGATION_OPS = [
  { label: "count", type: "function", detail: "Count values", apply: "count(" },
  { label: "count_unique", type: "function", detail: "Count unique values", apply: "count_unique(" },
  { label: "sum", type: "function", detail: "Sum of values", apply: "sum(" },
  { label: "mean", type: "function", detail: "Mean of values", apply: "mean(" },
  { label: "min", type: "function", detail: "Aggregate minimum (semi-lattice)", apply: "min(" },
  { label: "max", type: "function", detail: "Aggregate maximum (semi-lattice)", apply: "max(" },
  { label: "collect", type: "function", detail: "Collect values into list", apply: "collect(" },
  { label: "unique", type: "function", detail: "Collect unique values into list", apply: "unique(" },
  { label: "group_count", type: "function", detail: "Count occurrences per value", apply: "group_count(" },
  { label: "union", type: "function", detail: "Union of lists (semi-lattice)", apply: "union(" },
  { label: "intersection", type: "function", detail: "Intersection of lists", apply: "intersection(" },
  { label: "choice", type: "function", detail: "Choose non-null value", apply: "choice(" },
  { label: "choice_rand", type: "function", detail: "Randomly choose a value", apply: "choice_rand(" },
  { label: "min_cost", type: "function", detail: "Choose list with minimum cost", apply: "min_cost(" },
  { label: "shortest", type: "function", detail: "Shortest list (semi-lattice)", apply: "shortest(" },
  { label: "latest_by", type: "function", detail: "Value with maximum timestamp", apply: "latest_by(" },
  { label: "smallest_by", type: "function", detail: "Value with minimum cost", apply: "smallest_by(" },
  { label: "product", type: "function", detail: "Product of values", apply: "product(" },
  { label: "variance", type: "function", detail: "Sample variance", apply: "variance(" },
  { label: "std_dev", type: "function", detail: "Sample standard deviation", apply: "std_dev(" },
  { label: "bit_and", type: "function", detail: "Bitwise AND", apply: "bit_and(" },
  { label: "bit_or", type: "function", detail: "Bitwise OR", apply: "bit_or(" },
  { label: "bit_xor", type: "function", detail: "Bitwise XOR", apply: "bit_xor(" },
];

const ALGORITHMS = [
  { label: "PageRank", type: "class", detail: "PageRank centrality algorithm" },
  { label: "BFS", type: "class", detail: "Breadth-first search" },
  { label: "BreadthFirstSearch", type: "class", detail: "Breadth-first search" },
  { label: "DFS", type: "class", detail: "Depth-first search" },
  { label: "DepthFirstSearch", type: "class", detail: "Depth-first search" },
  { label: "ShortestPathDijkstra", type: "class", detail: "Dijkstra's shortest path" },
  { label: "ShortestPathAStar", type: "class", detail: "A* shortest path" },
  { label: "KShortestPathYen", type: "class", detail: "Yen's K shortest paths" },
  { label: "ConnectedComponents", type: "class", detail: "Find connected components" },
  { label: "StronglyConnectedComponents", type: "class", detail: "Find strongly connected components" },
  { label: "SCC", type: "class", detail: "Strongly connected components (alias)" },
  { label: "DegreeCentrality", type: "class", detail: "Compute degree centrality" },
  { label: "ClosenessCentrality", type: "class", detail: "Compute closeness centrality" },
  { label: "BetweennessCentrality", type: "class", detail: "Compute betweenness centrality" },
  { label: "CommunityDetectionLouvain", type: "class", detail: "Louvain community detection" },
  { label: "LabelPropagation", type: "class", detail: "Label propagation" },
  { label: "ClusteringCoefficients", type: "class", detail: "Compute clustering coefficients" },
  { label: "RandomWalk", type: "class", detail: "Perform random walk on graph" },
  { label: "Constant", type: "class", detail: "Return constant data" },
  { label: "ReorderSort", type: "class", detail: "Sort and reorder relation" },
  { label: "CsvReader", type: "class", detail: "Read CSV data" },
];

const FUNCTIONS = [
  // Comparison
  { label: "eq", detail: "Equality test" },
  { label: "neq", detail: "Inequality test" },
  { label: "gt", detail: "Greater than" },
  { label: "ge", detail: "Greater or equal" },
  { label: "lt", detail: "Less than" },
  { label: "le", detail: "Less or equal" },
  // Boolean
  { label: "negate", detail: "Boolean negate" },
  { label: "assert", detail: "Assert expression is true" },
  // Math
  { label: "add", detail: "Addition" },
  { label: "sub", detail: "Subtraction" },
  { label: "mul", detail: "Multiplication" },
  { label: "div", detail: "Division" },
  { label: "minus", detail: "Negate number" },
  { label: "pow", detail: "Power: x^y" },
  { label: "mod", detail: "Modulo: x%y" },
  { label: "abs", detail: "Absolute value" },
  { label: "signum", detail: "Sign of number" },
  { label: "floor", detail: "Floor of number" },
  { label: "ceil", detail: "Ceiling of number" },
  { label: "round", detail: "Round to nearest integer" },
  { label: "exp", detail: "Natural exponential e^x" },
  { label: "exp2", detail: "Base-2 exponential" },
  { label: "ln", detail: "Natural logarithm" },
  { label: "log2", detail: "Base-2 logarithm" },
  { label: "log10", detail: "Base-10 logarithm" },
  { label: "sin", detail: "Sine" },
  { label: "cos", detail: "Cosine" },
  { label: "tan", detail: "Tangent" },
  { label: "asin", detail: "Arcsine" },
  { label: "acos", detail: "Arccosine" },
  { label: "atan", detail: "Arctangent" },
  { label: "atan2", detail: "Two-argument arctangent" },
  { label: "sinh", detail: "Hyperbolic sine" },
  { label: "cosh", detail: "Hyperbolic cosine" },
  { label: "tanh", detail: "Hyperbolic tangent" },
  { label: "asinh", detail: "Inverse hyperbolic sine" },
  { label: "acosh", detail: "Inverse hyperbolic cosine" },
  { label: "atanh", detail: "Inverse hyperbolic tangent" },
  { label: "sqrt", detail: "Square root" },
  { label: "cbrt", detail: "Cube root" },
  { label: "hypot", detail: "Hypotenuse" },
  { label: "haversine", detail: "Haversine distance (radians)" },
  { label: "haversine_deg_input", detail: "Haversine distance (degrees)" },
  { label: "deg_to_rad", detail: "Degrees to radians" },
  { label: "rad_to_deg", detail: "Radians to degrees" },
  // String
  { label: "length", detail: "Length of string or list" },
  { label: "concat", detail: "Concatenate strings or lists" },
  { label: "str_includes", detail: "Check if string contains substring" },
  { label: "lowercase", detail: "Convert to lowercase" },
  { label: "uppercase", detail: "Convert to uppercase" },
  { label: "trim", detail: "Trim whitespace" },
  { label: "trim_start", detail: "Trim leading whitespace" },
  { label: "trim_end", detail: "Trim trailing whitespace" },
  { label: "starts_with", detail: "Check string prefix" },
  { label: "ends_with", detail: "Check string suffix" },
  { label: "unicode_normalize", detail: "Unicode NFC normalize" },
  { label: "chars", detail: "String to list of characters" },
  { label: "from_substrings", detail: "Join list into string" },
  { label: "split", detail: "Split string by separator" },
  { label: "slice", detail: "Slice string or list" },
  { label: "str_replace", detail: "Replace in string" },
  // List
  { label: "list", detail: "Create a list" },
  { label: "get", detail: "Get element by index" },
  { label: "first", detail: "First element of list" },
  { label: "last", detail: "Last element of list" },
  { label: "append", detail: "Append to list" },
  { label: "prepend", detail: "Prepend to list" },
  { label: "reverse", detail: "Reverse a list" },
  { label: "zip", detail: "Zip two lists" },
  { label: "flatten", detail: "Flatten nested list" },
  { label: "compact", detail: "Remove nulls from list" },
  { label: "take", detail: "Take first N elements" },
  { label: "drop", detail: "Drop first N elements" },
  { label: "chunks", detail: "Split list into chunks" },
  { label: "chunks_exact", detail: "Split into exact-size chunks" },
  { label: "windows", detail: "Sliding windows over list" },
  { label: "difference", detail: "Set difference of lists" },
  { label: "sorted", detail: "Sort a list" },
  { label: "sort_by", detail: "Sort list by key function" },
  // Bitwise
  { label: "bit_not", detail: "Bitwise NOT" },
  { label: "bit_shift_left", detail: "Bitwise left shift" },
  { label: "bit_shift_right", detail: "Bitwise right shift" },
  { label: "encode_base64", detail: "Encode as base64" },
  { label: "decode_base64", detail: "Decode from base64" },
  // Type checking
  { label: "to_int", detail: "Convert to integer" },
  { label: "to_float", detail: "Convert to float" },
  { label: "to_string", detail: "Convert to string" },
  { label: "to_bool", detail: "Convert to boolean" },
  { label: "to_uuid", detail: "Convert to UUID" },
  { label: "is_null", detail: "Check if null" },
  { label: "is_int", detail: "Check if integer" },
  { label: "is_float", detail: "Check if float" },
  { label: "is_finite", detail: "Check if finite number" },
  { label: "is_infinite", detail: "Check if infinite" },
  { label: "is_nan", detail: "Check if NaN" },
  { label: "is_num", detail: "Check if number" },
  { label: "is_bytes", detail: "Check if bytes" },
  { label: "is_list", detail: "Check if list" },
  { label: "is_string", detail: "Check if string" },
  { label: "is_uuid", detail: "Check if UUID" },
  { label: "coalesce", detail: "First non-null value" },
  { label: "null_if", detail: "Null if equal" },
  // Random
  { label: "rand_float", detail: "Random float in [0,1]" },
  { label: "rand_bernoulli", detail: "Random boolean" },
  { label: "rand_int", detail: "Random integer in range" },
  { label: "rand_choose", detail: "Random element from list" },
  { label: "rand_uuid_v1", detail: "Generate UUID v1" },
  { label: "rand_uuid_v4", detail: "Generate UUID v4" },
  // Regex
  { label: "regex_matches", detail: "Test regex match" },
  { label: "regex_replace", detail: "Replace first match" },
  { label: "regex_replace_all", detail: "Replace all matches" },
  { label: "regex_extract", detail: "Extract all matches" },
  { label: "regex_extract_first", detail: "Extract first match" },
  // Timestamp
  { label: "now", detail: "Current timestamp" },
  { label: "format_timestamp", detail: "Format as RFC3339" },
  { label: "parse_timestamp", detail: "Parse RFC3339 string" },
].map((f) => ({ ...f, type: "function", apply: f.label + "(" }));

const KEYWORDS = [
  { label: "not", type: "keyword", detail: "Negate a clause" },
  { label: "or", type: "keyword", detail: "Disjunction of clauses" },
  { label: "and", type: "keyword", detail: "Conjunction of clauses" },
  { label: "in", type: "keyword", detail: "Unify variable with list elements" },
  { label: "null", type: "keyword", detail: "Null literal" },
  { label: "true", type: "keyword", detail: "Boolean true" },
  { label: "false", type: "keyword", detail: "Boolean false" },
  { label: "default", type: "keyword", detail: "Default value for column" },
  { label: "none", type: "keyword", detail: "Assert no rows exist" },
  { label: "some", type: "keyword", detail: "Assert at least one row exists" },
];

const COL_TYPES = [
  { label: "Int", type: "type", detail: "Integer type" },
  { label: "Float", type: "type", detail: "Float type" },
  { label: "String", type: "type", detail: "String type" },
  { label: "Bool", type: "type", detail: "Boolean type" },
  { label: "Bytes", type: "type", detail: "Bytes type" },
  { label: "Uuid", type: "type", detail: "UUID type" },
  { label: "List", type: "type", detail: "List type" },
  { label: "Validity", type: "type", detail: "Validity (timestamp) type" },
];

// ── Context Detection ───────────────────────────────

function detectContext(node, textBefore) {
  // Walk up the tree
  let current = node;
  while (current) {
    const name = current.type.name;

    if (
      name === "SystemOp" ||
      name.startsWith("Sys")
    ) {
      return "system_op";
    }

    if (name.startsWith("Opt") && name !== "OptYield") {
      return "query_option";
    }

    if (name === "FixedRuleBody" || name === "AlgorithmName") {
      return "algorithm";
    }

    if (
      name === "RuleHead" ||
      name === "ruleHeadArgs" ||
      name === "ruleHeadVar"
    ) {
      return "rule_head";
    }

    if (name === "FunctionCall" || name === "ArgList" || name === "argListInner") {
      return "function_arg";
    }

    if (
      name === "RelationSpec" ||
      name === "ColSpec" ||
      name === "colTypeAnnotation" ||
      name === "keySpec" ||
      name === "valueSpec"
    ) {
      return "relation_spec";
    }

    if (
      name === "RuleBody" ||
      name === "Conjunction" ||
      name === "Disjunction" ||
      name === "Clause"
    ) {
      return "rule_body";
    }

    current = current.parent;
  }

  // Text-based fallback
  const stripped = textBefore.trimStart();
  if (stripped.startsWith("::")) return "system_op";
  if (/^\s*:(?![:=])/.test(textBefore.split("\n").pop())) return "query_option";
  if (/<~\s*\w*$/.test(textBefore)) return "algorithm";

  return "general";
}

function extractUserRelations(state) {
  const text = state.doc.toString();
  const relations = new Set();
  for (const match of text.matchAll(
    /:(create|put|rm|replace|ensure)\s+(\w[\w.]*)/g
  )) {
    relations.add(match[2]);
  }
  for (const match of text.matchAll(/\*(\w[\w.]*)/g)) {
    relations.add(match[1]);
  }
  return Array.from(relations).map((name) => ({
    label: name,
    type: "variable",
    detail: "User relation",
    boost: 3,
  }));
}

// ── Completion Source ────────────────────────────────

export function cozoCompletions(context) {
  const tree = syntaxTree(context.state);
  const nodeBefore = tree.resolveInner(context.pos, -1);

  const lineStart = context.state.doc.lineAt(context.pos).from;
  const textBefore = context.state.sliceDoc(lineStart, context.pos);
  const fullTextBefore = context.state.sliceDoc(0, context.pos);

  // Check for :: or : prefix
  const colonMatch = textBefore.match(/(::?\w*)$/);
  if (colonMatch) {
    const prefix = colonMatch[1];
    if (prefix.startsWith("::")) {
      return {
        from: context.pos - prefix.length,
        options: SYSTEM_OPS,
        validFor: /^::?\w*$/,
      };
    }
    if (prefix.startsWith(":") && !prefix.startsWith(":=")) {
      return {
        from: context.pos - prefix.length,
        options: QUERY_OPTIONS,
        validFor: /^:\w*$/,
      };
    }
  }

  // Word-based completion
  const word = context.matchBefore(/\w+/);
  if (!word && !context.explicit) return null;
  const from = word ? word.from : context.pos;

  const ctx = detectContext(nodeBefore, fullTextBefore);

  let options = [];

  switch (ctx) {
    case "system_op":
      // Already handled by colon prefix above
      break;

    case "query_option":
      // Already handled by colon prefix above
      break;

    case "algorithm":
      options = ALGORITHMS;
      break;

    case "rule_head":
      options = AGGREGATION_OPS;
      break;

    case "relation_spec":
      options = COL_TYPES;
      break;

    case "function_arg":
    case "rule_body":
    case "general":
    default:
      options = [
        ...FUNCTIONS.map((f) => ({ ...f, boost: 2 })),
        ...KEYWORDS,
        ...AGGREGATION_OPS.map((a) => ({ ...a, boost: 1 })),
        ...ALGORITHMS.map((a) => ({
          ...a,
          apply: a.label + "(",
          boost: 0,
        })),
        ...extractUserRelations(context.state),
      ];
      break;
  }

  if (options.length === 0) return null;

  return {
    from,
    options,
    validFor: /^\w*$/,
  };
}
