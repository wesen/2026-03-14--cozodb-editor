#!/bin/bash
# Test basic CozoDB queries via HTTP API
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

echo "=== CozoDB Experiment: Basic Queries ==="
echo ""

# 1. Simple constant rule
query "Hello World" "?[] <- [['hello', 'world', 'Cozo!']]"

# 2. Create a stored relation for users
query "Create users table" \
    ":create users {name: String => age: Int, email: String}"

# 3. Insert data
query "Insert users" \
    "?[name, age, email] <- [['Alice', 34, 'alice@example.com'], ['Bob', 28, 'bob@example.com'], ['Carlos', 41, 'carlos@example.com'], ['Diana', 37, 'diana@example.com'], ['Eve', 25, 'eve@example.com']]\n:put users {name => age, email}"

# 4. Query all users
query "All users" \
    "?[name, age, email] := *users{name, age, email}"

# 5. Filter: users older than 30
query "Users older than 30" \
    "?[name, age] := *users{name, age}, age > 30"

# 6. Count users
query "Count users" \
    "?[count(name)] := *users{name}"

# 7. Aggregation: average age
query "Average age" \
    "?[mean(age)] := *users{age}"

# 8. Create love relation (graph)
query "Create love relation" \
    ":create love {loving: String, loved: String}"

query "Insert love edges" \
    "?[loving, loved] <- [['alice', 'bob'], ['bob', 'carlos'], ['carlos', 'diana'], ['diana', 'alice'], ['eve', 'alice']]\n:put love {loving, loved}"

# 9. Transitive closure (recursive query)
query "Love chain from Alice" \
    "alice_chain[person] := *love['alice', person]\nalice_chain[person] := alice_chain[prev], *love[prev, person]\n?[person] := alice_chain[person]"

# 10. List all relations
query "List all relations" \
    "::relations"

# 11. Show columns of users
query "Users columns" \
    "::columns users"

echo "=== Done ==="
