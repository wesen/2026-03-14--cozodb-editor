---
Title: CozoDB Backend Guide
Ticket: COZODB-001
Status: active
Topics:
    - cozodb
    - backend
    - datalog
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - "/home/manuel/code/wesen/2026-03-14--cozodb-editor/bin/cozo:CozoDB v0.7.6 standalone binary"
    - "/home/manuel/code/wesen/2026-03-14--cozodb-editor/ttmp/2026/03/14/COZODB-001--cozodb-datalog-pad-go-backend-ai-hints-and-frontend/scripts:Experiment scripts for CozoDB"
ExternalSources:
    - "https://github.com/cozodb/cozo — CozoDB main repository"
    - "https://github.com/cozodb/cozo-lib-go — Official Go bindings"
    - "https://docs.cozodb.org/en/latest/ — CozoDB v0.7 documentation"
Summary: "How to build a Go backend wrapping CozoDB for the Datalog Pad — embedding options, Go bindings, query API, schema management, error handling, and HTTP/WebSocket API design"
LastUpdated: 2026-03-14T15:00:00.000000000-04:00
WhatFor: "Guide for implementing the CozoDB Go backend service"
WhenToUse: "When implementing the Go backend that wraps CozoDB"
---

# CozoDB Backend Guide

## Executive Summary

Build a Go backend service that embeds CozoDB (v0.7.6) via the official Go bindings
(`cozo-lib-go`) to provide:
1. CozoScript query execution with parameterized inputs
2. Schema management (create/list/describe stored relations)
3. Structured error reporting (for AI diagnosis)
4. HTTP REST + WebSocket API for the frontend

CozoDB is a transactional, relational-graph-vector database using Datalog (CozoScript)
for queries. It supports in-memory, SQLite, and RocksDB storage backends.

## CozoDB Overview

### What CozoDB Is

- **Embedded database** — runs in-process, no separate server needed
- **Datalog query language** (CozoScript) — not standard Datalog, but a rich dialect
- **Triple store** with stored relations (tables with typed columns)
- **Graph algorithms** built-in (PageRank, shortest path, community detection, etc.)
- **Time-travel** queries via Validity type
- **Vector search** support (HNSW indices)
- **Full-text search** (MinHash-LSH)

### CozoScript vs Standard Datalog

CozoScript differs from Datomic/DataScript Datalog in important ways:

| Feature | CozoScript | Datomic Datalog |
|---------|-----------|----------------|
| Rule syntax | `?[vars] := body` | `[:find vars :where clauses]` |
| Stored relations | `*relation{cols}` | `[?e :attr ?val]` |
| Constants | `rule[a] <- [[1, 2]]` | N/A (inline data) |
| Algorithms | `?[] <~ PageRank(...)` | External |
| Schema | `:create rel {cols}` | Transact schema maps |
| Primary keys | `{key => val}` syntax | Entity IDs |
| Aggregation | In rule head: `?[count(x)]` | `:with` / pull |

This means the AI hint engine needs CozoScript-specific knowledge, not generic
Datomic Datalog. The frontend prototype's mock responses use Datomic syntax — these
need to be adapted.

### CozoScript Quick Reference

**Three rule types:**
```
# Constant rule — inline data
?[a, b] <- [[1, "hello"], [2, "world"]]

# Inline rule — logic/joins
?[name, age] := *users{name, age}, age > 30

# Fixed rule — algorithms
?[node, rank] <~ PageRank(*follows[])
```

**Stored relations:**
```
# Create with typed columns (before => are primary keys)
:create users {name: String => age: Int, email: String}

# Insert/upsert
?[name, age, email] <- [["Alice", 34, "alice@example.com"]]
:put users {name => age, email}

# Query
?[name, age] := *users{name, age}

# Named field access (flexible column order)
?[email] := *users{name: "Alice", email}

# Delete
?[name] <- [["Alice"]]
:rm users {name}

# Drop relation
::remove users
```

**System operations:**
```
::relations                    # List all relations
::columns users                # Show columns of a relation
::access_level read_only users # Lock a relation
```

**Query options:**
```
:limit 10
:offset 5
:order -age, name    # - prefix = descending
:timeout 30          # seconds
:assert some         # error if empty
```

**Joins** — shared variables across clauses:
```
?[name, email] := *users{name, age}, *emails{name, email}, age > 30
```

**Negation:**
```
?[name] := *users{name}, not *banned{name}
```

**Recursion:**
```
reachable[to] := *edges["start", to]
reachable[to] := reachable[mid], *edges[mid, to]
?[node] := reachable[node]
```

**Aggregation** (applied in rule head):
```
?[count(name)] := *users{name}
?[dept, mean(salary)] := *employees{dept, salary}
```

### Error Message Format

CozoDB produces structured errors with:
- **Error code**: e.g., `eval::unbound_symb_in_head`, `query::relation_not_found`
- **Message**: e.g., "Symbol 'x' in rule head is unbound"
- **Help text**: e.g., "Note that symbols occurring only in negated positions are not considered bound"

Tested error examples:
```
eval::unbound_symb_in_head
  × Symbol 'x' in rule head is unbound
  help: Note that symbols occurring only in negated positions are not considered bound

query::relation_not_found
  × Cannot find requested stored relation 'nonexistent'

eval::throw
  × Evaluation of expression failed
  help: comparison can only be done between the same datatypes, got 34 and "thirty"
```

These structured errors are perfect for the AI diagnosis feature — we can parse the
error code and pass it along with the query to the LLM for targeted help.

### Available Functions (for AI hints)

**Math:** add, sub, mul, div, pow, sqrt, abs, floor, ceil, round, sin, cos, tan, exp, ln, log2, log10

**String:** length, concat (++), str_includes, lowercase, uppercase, trim, starts_with, ends_with, regex_matches, regex_replace, regex_extract

**List:** list, is_in, first, last, get, length, slice, concat, append, prepend, reverse, sorted, union, intersection, difference

**Type:** is_null, is_int, is_float, is_string, is_list, to_string, to_float, to_int, coalesce (~)

**Aggregation:** count, count_unique, sum, min, max, mean, std_dev, collect, group_concat

**Comparison:** eq (==), neq (!=), gt (>), ge (>=), lt (<), le (<=)

### Available Graph Algorithms (Fixed Rules)

| Algorithm | Syntax | Purpose |
|-----------|--------|---------|
| PageRank | `<~ PageRank(*edges[])` | Node importance |
| ShortestPathDijkstra | `<~ ShortestPathDijkstra(*edges[], start[], goal[])` | Weighted shortest path |
| ShortestPathBFS | `<~ ShortestPathBFS(*edges[], start[], goal[])` | Unweighted shortest path |
| KShortestPathYen | `<~ KShortestPathYen(*edges[], start[], goal[], k: 10)` | K best paths |
| ConnectedComponents | `<~ ConnectedComponents(*edges[])` | Undirected components |
| SCC | `<~ SCC(*edges[])` | Strongly connected components |
| CommunityDetectionLouvain | `<~ CommunityDetectionLouvain(*edges[])` | Community detection |
| LabelPropagation | `<~ LabelPropagation(*edges[])` | Community detection |
| BetweennessCentrality | `<~ BetweennessCentrality(*edges[])` | Node centrality |
| ClosenessCentrality | `<~ ClosenessCentrality(*edges[])` | Node centrality |
| DegreeCentrality | `<~ DegreeCentrality(*edges[])` | In/out degree |
| MinimumSpanningForestKruskal | `<~ MinimumSpanningForestKruskal(*edges[])` | MST |
| TopSort | `<~ TopSort(*edges[])` | Topological ordering |
| BFS/DFS | `<~ BFS(*edges[], start[], condition: ...)` | Graph traversal |
| RandomWalk | `<~ RandomWalk(*edges[], start[], steps: N)` | Random walk |

**Utilities:**
| Utility | Purpose |
|---------|---------|
| `Constant(data: [...])` | Inline data source |
| `ReorderSort(...)` | Sort and project |
| `CsvReader(url: ..., types: [...])` | Read CSV from URL/file |
| `JsonReader(url: ..., fields: [...])` | Read JSON from URL/file |

## Go Integration via cozo-lib-go

### Setup

The official Go bindings use cgo to link against `libcozo_c`:

```bash
# Download pre-compiled C library
wget https://github.com/cozodb/cozo/releases/download/v0.7.6/libcozo_c-0.7.6-x86_64-unknown-linux-gnu.a.gz
gunzip libcozo_c-*.gz

# Set CGO flags
export CGO_LDFLAGS="-L/path/to/libs -lcozo_c -lstdc++ -lm"
```

### Core API

```go
import cozo "github.com/cozodb/cozo-lib-go"

// Create database
db := cozo.New("mem", "", nil)  // engine, path, options
defer db.Close()

// Run queries
result := db.Run("?[name, age] := *users{name, age}, age > $min_age", map[string]interface{}{
    "min_age": 30,
})

// Result is NamedRows: {headers: []string, rows: [][]interface{}}

// Export/Import
exported := db.ExportRelations([]string{"users", "love"})
db.ImportRelations(payload)

// Backup
db.Backup("/path/to/backup")
db.Restore("/path/to/backup")
```

### Result Format

Query results come back as JSON with:
```json
{
  "ok": true,
  "headers": ["name", "age"],
  "rows": [["Alice", 34], ["Carlos", 41]]
}
```

Error results:
```json
{
  "ok": false,
  "message": "Symbol 'x' in rule head is unbound",
  "display": "eval::unbound_symb_in_head\n  × Symbol 'x'..."
}
```

## Proposed Go Backend Architecture

### Service Structure

```
cmd/cozodb-editor/
    main.go              # Entry point, wire everything
pkg/
    cozo/
        db.go            # CozoDB wrapper (init, query, schema ops)
        errors.go        # Parse CozoDB error messages into structured types
        schema.go        # Schema introspection helpers
    api/
        router.go        # HTTP router setup
        handlers.go      # REST handlers
        websocket.go     # WebSocket upgrade + message handling
        types.go         # Request/response types
    hints/
        engine.go        # AI hint engine integration (see AI Hint Guide)
        prompt.go        # Prompt templates for hint generation
```

### HTTP API Design

```
POST /api/query          — Execute CozoScript, return results or errors
POST /api/schema/create  — Create a stored relation
GET  /api/schema/list    — List all relations
GET  /api/schema/:name   — Describe a relation's columns
POST /api/schema/drop    — Drop a relation
POST /api/import         — Bulk import data
GET  /api/export/:rels   — Export relations as JSON

WS   /ws/hints           — WebSocket for streaming AI hints
WS   /ws/query           — WebSocket for streaming query results (future)
```

### Query Request/Response Types

```go
// QueryRequest is sent by the frontend
type QueryRequest struct {
    Script string                 `json:"script"`
    Params map[string]interface{} `json:"params,omitempty"`
}

// QueryResult is the successful response
type QueryResult struct {
    OK      bool          `json:"ok"`
    Headers []string      `json:"headers"`
    Rows    [][]any       `json:"rows"`
    Time    float64       `json:"time_ms"`
}

// QueryError is the error response
type QueryError struct {
    OK      bool   `json:"ok"`
    Code    string `json:"code"`     // e.g. "eval::unbound_symb_in_head"
    Message string `json:"message"`  // Human-readable error
    Help    string `json:"help"`     // CozoDB help text
    Display string `json:"display"`  // Full formatted error
}
```

### CozoDB Wrapper

```go
type CozoDB struct {
    db     *cozo.CozoDB
    engine string
}

func NewCozoDB(engine, path string) (*CozoDB, error) {
    db := cozo.New(engine, path, nil)
    return &CozoDB{db: db, engine: engine}, nil
}

func (c *CozoDB) Query(script string, params map[string]interface{}) (*QueryResult, *QueryError) {
    result := c.db.Run(script, params)
    if !result.OK {
        return nil, parseError(result)
    }
    return &QueryResult{
        OK:      true,
        Headers: result.Headers,
        Rows:    result.Rows,
    }, nil
}

func (c *CozoDB) ListRelations() (*QueryResult, error) {
    return c.Query("::relations", nil)
}

func (c *CozoDB) DescribeRelation(name string) (*QueryResult, error) {
    return c.Query("::columns "+name, nil)
}
```

## Design Decisions

### 1. Embed CozoDB via Go bindings (not HTTP server)

**Decision:** Use `cozo-lib-go` cgo bindings, not the standalone HTTP server.

**Why:**
- The standalone binary has a hardcoded port 3000 bind for its web UI (confirmed
  via strace: always binds to 3000 regardless of `-P` flag)
- Embedding gives us direct control over the database lifecycle
- No network overhead for queries
- Single binary deployment

**Trade-off:** Requires cgo and linking against `libcozo_c`. Build is more complex
but runtime is simpler.

### 2. In-memory engine for development, SQLite for persistence

**Decision:** Default to `mem` engine for development/testing, `sqlite` for production.

**Why:**
- `mem` is fastest, no disk I/O, perfect for experimentation
- `sqlite` gives durability without RocksDB's operational complexity
- Can switch engines with a single config flag

### 3. Parse CozoDB errors into structured types

**Decision:** Parse the error display string into code + message + help components.

**Why:** The AI hint engine needs structured error information to generate targeted
diagnosis. CozoDB errors follow a consistent format:
```
error_category::error_type
  × Error message
  help: Help text
```

### 4. Expose both REST and WebSocket APIs

**Decision:** REST for queries/schema ops, WebSocket for AI hints.

**Why:**
- Queries are request/response — REST is natural
- AI hints need streaming (tokens arrive incrementally) — WebSocket is natural
- Both share the same CozoDB instance

## Implementation Plan

1. **Set up Go module** with cozo-lib-go dependency
2. **Implement CozoDB wrapper** (db.go, errors.go, schema.go)
3. **Implement REST API** for query execution and schema management
4. **Add error parsing** to extract structured error info
5. **Implement WebSocket endpoint** for AI hint streaming
6. **Wire up the AI hint engine** (separate guide)
7. **Add CORS and middleware** for frontend integration
8. **Create Dockerfile** with pre-built libcozo_c

## Open Questions

1. **RocksDB vs SQLite for production** — RocksDB is faster for large datasets
   but adds operational complexity. Need to benchmark with expected data sizes.
2. **Connection pooling** — cozo-lib-go is single-threaded? Need to verify
   thread safety of the Go bindings.
3. **Query timeout** — CozoDB supports `:timeout N` in queries, but should we
   also enforce timeouts at the Go level?
4. **Authentication** — The standalone server has token auth; our Go wrapper
   needs its own auth layer.

## References

- [CozoDB GitHub](https://github.com/cozodb/cozo)
- [CozoDB Go Bindings](https://github.com/cozodb/cozo-lib-go)
- [CozoDB v0.7 Documentation](https://docs.cozodb.org/en/latest/)
- [CozoScript Tutorial](https://docs.cozodb.org/en/latest/tutorial.html)
- [CozoScript Query Syntax](https://docs.cozodb.org/en/latest/queries.html)
- [CozoDB Functions](https://docs.cozodb.org/en/latest/functions.html)
- [CozoDB Algorithms](https://docs.cozodb.org/en/latest/algorithms.html)
