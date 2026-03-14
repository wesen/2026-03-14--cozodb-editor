#!/bin/bash
# Run CozoDB experiments via REPL pipe
# This scripts pipes multiple queries through the REPL to test CozoDB behavior

COZO="/home/manuel/code/wesen/2026-03-14--cozodb-editor/bin/cozo"

run_queries() {
cat <<'QUERIES'
?[] <- [["hello", "world", "Cozo!"]]
:create users {name: String => age: Int, email: String}
?[name, age, email] <- [["Alice", 34, "alice@example.com"], ["Bob", 28, "bob@example.com"], ["Carlos", 41, "carlos@example.com"], ["Diana", 37, "diana@example.com"], ["Eve", 25, "eve@example.com"]] :put users {name => age, email}
?[name, age, email] := *users{name, age, email}
?[name, age] := *users{name, age}, age > 30
?[count(name)] := *users{name}
?[mean(age)] := *users{age}
:create love {loving: String, loved: String}
?[loving, loved] <- [["alice", "bob"], ["bob", "carlos"], ["carlos", "diana"], ["diana", "alice"], ["eve", "alice"]] :put love {loving, loved}
alice_chain[person] := *love["alice", person] alice_chain[person] := alice_chain[prev], *love[prev, person] ?[person] := alice_chain[person]
::relations
::columns users
QUERIES
}

echo "=== CozoDB REPL Experiments ==="
echo ""
run_queries | "$COZO" repl 2>&1
echo ""
echo "=== Done ==="
