#!/bin/bash
# Test CozoDB error messages — useful for understanding what the AI error
# diagnosis feature needs to handle
# Requires: CozoDB server running on port 9070

API="http://127.0.0.1:9070/text-query"

query() {
    local desc="$1"
    local script="$2"
    echo "=== $desc ==="
    curl -s -X POST "$API" \
        -H "Content-Type: application/json" \
        -d "{\"script\": \"$script\", \"params\": {}}" | python3 -m json.tool
    echo ""
}

echo "=== CozoDB Error Messages Test ==="
echo ""

# Error: Missing variable binding
query "ERROR: missing binding" \
    "?[name] := *users{age}"

# Error: Unknown relation
query "ERROR: unknown relation" \
    "?[x] := *nonexistent{x}"

# Error: Syntax error
query "ERROR: syntax error" \
    "?[x] := *users{name"

# Error: Type mismatch
query "ERROR: type comparison" \
    "?[name] := *users{name, age}, age > 'thirty'"

# Error: Unbound variable
query "ERROR: unbound variable in head" \
    "?[name, x] := *users{name}"

# Error: Wrong arity
query "ERROR: wrong arity" \
    "?[a, b, c, d, e] := *users{name}"

echo "=== Done ==="
