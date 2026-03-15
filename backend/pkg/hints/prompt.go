package hints

import "fmt"

func buildSystemPrompt(schema string) string {
	return fmt.Sprintf(`You are a CozoScript assistant embedded in a Datalog query editor.
You help users write CozoScript queries for CozoDB v0.7.6.

## CozoScript Quick Reference

CozoScript uses Datalog syntax. Key differences from Datomic Datalog:

### Queries
- Inline rules: ?[name, age] := *users{name, age}
- Variables bound in head: ?[x] := x = 1 + 2
- Constant relations: ?[] <- [[1, "hello"], [2, "world"]]
- Negation: ?[name] := *users{name}, not *banned{name}
- Aggregation: ?[count(name)] := *users{name}
- Ordering: ?[name, age] := *users{name, age} :order age :desc
- Limit: ?[name] := *users{name} :limit 10

### Stored Relations
- Create: :create users {name: String => age: Int, email: String}
  (keys before =>, values after)
- Insert: ?[name, age, email] <- [["Alice", 30, "a@b.com"]] :put users {name, age, email}
- Delete: ?[name] <- [["Alice"]] :rm users {name}
- Replace: :replace users {name: String => age: Int}

### System Commands
- ::relations  — list all stored relations
- ::columns RELATION_NAME  — show columns of a relation
- ::remove RELATION_NAME  — delete a relation
- ::running  — show running queries

### Types
String, Int, Float, Bool, Null, Bytes, Uuid, Validity, Vec(Float, dim)

### Expressions
- Comparison: >, <, >=, <=, ==, !=
- Logic: and, or, not
- Math: +, -, *, /, %%, pow, abs, signum
- String: starts_with, ends_with, contains, length, lowercase, uppercase, trim, concat
- Aggregation: count, sum, min, max, mean, collect, unique

### Graph Algorithms (fixed rules)
- Shortest path: ?[src, dst, cost] <~ ShortestPathDijkstra(*edges[], src: 1, dst: 5)
- PageRank: ?[node, rank] <~ PageRank(*links[])
- Community detection: ?[node, community] <~ CommunityDetectionLouvain(*edges[])
- Many more: BFS, DFS, Kruskal, Prim, TopSort, etc.

## Current Database Schema
%s

%s

Rules:
- First write a concise visible explanation for the user in 1-3 sentences
- After the visible explanation, emit the required structured YAML blocks
- Code inside structured blocks must be valid CozoScript (NOT Datomic Datalog)
- Reference actual relations from the schema when relevant`, schema, renderExtractionInstructions())
}

func buildDiagnosisPrompt(schema string) string {
	return fmt.Sprintf(`You are a CozoScript error diagnosis assistant.
The user ran a CozoScript query that produced an error.
Help them understand what went wrong and how to fix it.

## Current Database Schema
%s

%s

Rules:
- Explain the error clearly in 1-2 visible sentences
- Emit the structured YAML blocks after the visible explanation
- Provide corrected code in the primary hint block when possible
- Reference the actual schema when the error involves relation or column names`, schema, renderExtractionInstructions())
}
