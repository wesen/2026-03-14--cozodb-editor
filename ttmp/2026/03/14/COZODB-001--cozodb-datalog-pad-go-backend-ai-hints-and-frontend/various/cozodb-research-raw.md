# CozoDB Research Report: Building a Go Backend Wrapper

## 1. Overview

CozoDB is a transactional, relational-graph-vector database that uses **Datalog** (specifically **CozoScript**) for queries. Written in Rust, it is designed primarily as an **embeddable** database (runs in your application process) but also supports a standalone HTTP server mode.

- **Repository**: https://github.com/cozodb/cozo
- **Documentation**: https://docs.cozodb.org/en/latest/
- **License**: MPL-2.0
- **Current Version**: v0.7.6 (December 2023)
- **Status**: Pre-1.0; no guaranteed API/storage stability between versions

Key differentiators:
- Datalog query language (superior composability vs SQL, natural recursion for graph traversal)
- Hybrid relational-graph-vector model
- Time-travel (temporal queries)
- HNSW vector search, full-text search, MinHash-LSH
- Embeddable with multiple storage backends

---

## 2. Deployment Modes

### 2.1 Embedded Library (Primary Mode)

CozoDB runs in-process via language bindings. Available for:

| Language | Package | Storage Engines |
|----------|---------|-----------------|
| Rust | `cargo add cozo` | All |
| Python | `pip install pycozo` | mem, SQLite, RocksDB |
| Node.js | `npm install cozo-node` | mem, SQLite, RocksDB |
| Java/Clojure | Maven | mem, SQLite, RocksDB |
| **Go** | `github.com/cozodb/cozo-lib-go` | mem, SQLite, RocksDB |
| C/C++ | `libcozo_c` (static/shared) | mem, SQLite, RocksDB |
| Swift (iOS/macOS) | Native | mem, SQLite |
| WASM (Browser) | npm package | mem only |

### 2.2 Standalone HTTP Server

Binary: `cozoserver` (or `cozo-bin`). Downloadable from GitHub releases for Linux (x86_64, aarch64), macOS (Intel, ARM), Windows.

```bash
# Start server
./cozoserver server --engine rocksdb --path ./mydb --bind 0.0.0.0 --port 9070
```

Authentication: token-based. When binding to non-localhost addresses, a 64-character random token is generated and stored in `{path}.{engine}.cozo_auth`. Clients authenticate via:
- Query parameter: `?auth=<token>`
- Header: `x-cozo-auth: <token>`
- Bearer token: `Authorization: Bearer <token>`

Auth is **skipped** when binding to `127.0.0.1`.

### 2.3 Storage Backends

| Engine | Characteristics |
|--------|----------------|
| `mem` | Non-persistent, fastest, RAM-bound |
| `sqlite` | Embedded, good for backup format, moderate performance |
| `rocksdb` | High-performance, recommended for production, large value support via BlobDB |
| `sled` | Rust-native embedded (experimental) |
| `tikv` | Distributed persistence across clusters |

---

## 3. HTTP API Reference

The standalone server exposes these endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | HTML admin interface |
| `/text-query` | POST | Execute CozoScript queries |
| `/export/:relations` | GET | Export relations (comma-separated names) |
| `/import` | PUT | Import relations from JSON |
| `/backup` | POST | Create database backup |
| `/import-from-backup` | POST | Restore specific relations from backup |
| `/changes/:relation` | GET | SSE stream of relation changes |
| `/transact` | POST | Start a transaction session |
| `/transact/:id` | POST | Execute query within transaction |
| `/transact/:id` | PUT | Commit or abort transaction |

### Key Request/Response Formats

**Execute Query** (`POST /text-query`):
```json
// Request
{
  "script": "?[a, b] := *my_relation{a, b}",
  "params": {"param1": "value1"},
  "immutable": false
}

// Response (success)
{
  "ok": true,
  "headers": ["a", "b"],
  "rows": [[1, "hello"], [2, "world"]],
  "took": 0.001
}

// Response (error)
{
  "ok": false,
  "display": "error message",
  ...
}
```

**Import Relations** (`PUT /import`):
```json
{
  "relation_name": {
    "headers": ["col1", "col2"],
    "rows": [[1, "a"], [2, "b"]]
  }
}
```

**Backup** (`POST /backup`):
```json
{"path": "/path/to/backup.db"}
```

**Transactions** (`POST /transact?write=true`):
```json
// Response: {"ok": true, "id": 123}
// Then POST /transact/123 with queries
// Finally PUT /transact/123 with {"abort": false} to commit
```

---

## 4. Go Bindings (Official)

**Package**: `github.com/cozodb/cozo-lib-go` (v0.7.5, MIT license)
**Repository**: https://github.com/cozodb/cozo-lib-go

### 4.1 Installation

The Go bindings use **CGo** to wrap the C FFI library (`libcozo_c`):

```bash
# Download the pre-built C library
COZO_VERSION=0.7.5
COZO_PLATFORM=x86_64-unknown-linux-gnu  # or aarch64-apple-darwin, x86_64-apple-darwin

URL=https://github.com/cozodb/cozo/releases/download/v${COZO_VERSION}/libcozo_c-${COZO_VERSION}-${COZO_PLATFORM}.a.gz

mkdir libs
curl -L $URL -o libs/libcozo_c.a.gz
gunzip -f libs/libcozo_c.a.gz

# Set CGo linker flags
export CGO_LDFLAGS="-L/${PWD}/libs"

# Then use the Go package
go get github.com/cozodb/cozo-lib-go
```

CGo linker flags required (already set in `cozo.go`):
```
#cgo LDFLAGS: -lcozo_c -lstdc++ -lm
#cgo windows LDFLAGS: -lbcrypt -lwsock32 -lws2_32 -lshlwapi -lrpcrt4
#cgo darwin LDFLAGS: -framework Security
```

### 4.2 Go API

```go
package cozo

// Core type
type CozoDB struct {
    Id C.int32_t
}

// Result type
type NamedRows struct {
    Headers [][]string `json:"headers"`
    Rows    [][][]any  `json:"rows"`
    Took    float64    `json:"took"`
    Ok      bool       `json:"ok"`
}

// Error type
type QueryError struct {
    Data Map  // objx.Map
}

// Constructor - engine: "mem", "sqlite", "rocksdb"
func New(engine string, path string, options Map) (CozoDB, error)

// Execute CozoScript query with optional parameters
func (db *CozoDB) Run(query string, params Map) (NamedRows, error)

// Close the database (must call to free native resources)
func (db *CozoDB) Close()

// Import/Export
func (db *CozoDB) ExportRelations(relations []string) (Map, error)
func (db *CozoDB) ImportRelations(payload Map) error

// Backup/Restore
func (db *CozoDB) Backup(path string) error
func (db *CozoDB) Restore(path string) error
func (db *CozoDB) ImportRelationsFromBackup(path string, relations []string) error
```

### 4.3 Usage Example

```go
package main

import (
    cozo "github.com/cozodb/cozo-lib-go"
)

func main() {
    // Open in-memory database
    db, err := cozo.New("mem", "", nil)
    if err != nil {
        panic(err)
    }
    defer db.Close()

    // Create a relation
    _, err = db.Run(":create users {id: Int => name: String, email: String}", nil)

    // Insert data
    _, err = db.Run(`
        ?[id, name, email] <- [[1, "Alice", "alice@example.com"], [2, "Bob", "bob@example.com"]]
        :put users {id => name, email}
    `, nil)

    // Query
    result, err := db.Run("?[id, name, email] := *users{id, name, email}", nil)
    // result.Headers, result.Rows contain the data
}
```

### 4.4 Connecting from Go: Options Summary

| Method | Pros | Cons |
|--------|------|------|
| **CGo FFI** (official `cozo-lib-go`) | Direct embedding, lowest latency, no network overhead | CGo build complexity, static C library dependency, cross-compilation harder |
| **HTTP Client** (to standalone server) | No CGo, easy cross-compilation, language-agnostic | Network latency, separate process management, auth setup |
| **HTTP via Docker** | Easiest deployment, no build dependencies | Most overhead, container management |

**Recommendation for Go backend**: Use the **HTTP client approach** for simplicity and Go cross-compilation friendliness, or the **CGo FFI** if you need maximum performance and can accept the build complexity.

---

## 5. CozoScript Query Language

### 5.1 Core Concepts

CozoScript is a **Datalog dialect** -- a declarative, logic-based query language. Queries consist of **rules** that define relations (sets of rows).

Three rule types:
- **Inline rules** (`:=`): Core logic, support recursion
- **Constant rules** (`<-`): Literal data
- **Fixed rules** (`<~`): Built-in algorithms (PageRank, shortest path, etc.)

The special rule named `?` is the **entry point** that returns results.

### 5.2 Basic Syntax

```datalog
# Constant data
?[greeting] <- [["hello"], ["world"]]

# Inline rule querying a stored relation (prefixed with *)
?[name, email] := *users{name, email}

# With filter
?[name, email] := *users{name, email}, starts_with(email, "alice")

# With computed column
?[name, domain] := *users{name, email}, [_, domain] = split(email, "@")

# Parameterized query (params passed as JSON)
?[name] := *users{id: $target_id, name}
```

### 5.3 Relation Access Patterns

Two syntaxes for accessing stored relations:

```datalog
# Positional binding (order matters)
?[a, b, c] := *rel[a, b, c]

# Named binding (order doesn't matter, partial binding OK)
?[name] := *users{id: 1, name}
?[name, email] := *users{name, email}   # binds only name and email
```

### 5.4 Joins

Joins happen **implicitly** through shared variable names:

```datalog
# Inner join: users and orders share 'user_id'
?[user_name, order_total] := *users{id: user_id, name: user_name},
                              *orders{user_id, total: order_total}
```

### 5.5 Negation

```datalog
# Expression negation (!)
?[name] := *users{name}, !starts_with(name, "A")

# Atom negation (not) - "users without orders"
?[name] := *users{id, name}, not *orders{user_id: id}
```

Safety rule: Variables in negated atoms must also appear in a positive atom.

### 5.6 Disjunction (OR)

Multiple definitions of the same rule act as UNION:

```datalog
important[id] := *flagged{id}
important[id] := *recent{id}, *unread{id}
?[id] := important[id]
```

Or use `or`/`and` inline:
```datalog
?[name] := *users{name}, (starts_with(name, "A") or starts_with(name, "B"))
```

### 5.7 Recursion

```datalog
# Find all nodes reachable from 'start'
reachable[node] := *edges{from: "start", to: node}
reachable[node] := reachable[intermediate], *edges{from: intermediate, to: node}
?[node] := reachable[node]
```

### 5.8 Aggregation

```datalog
# Count users per department
?[dept, count(name)] := *users{dept, name}

# Multiple aggregations
?[dept, count(name), mean(salary)] := *users{dept, name, salary}
```

**Semi-lattice aggregations** (usable in recursive rules): `min`, `max`, `and`, `or`, `union`, `intersection`, `choice`, `shortest`, `min_cost`

**Ordinary aggregations**: `count`, `count_unique`, `sum`, `mean`, `std_dev`, `variance`, `product`, `collect`, `unique`, `group_count`, `latest_by`, `smallest_by`, `choice_rand`

### 5.9 Query Options

```datalog
?[name, score] := *users{name, score}
:limit 10
:offset 20
:order -score, name    # descending score, ascending name
:timeout 30            # seconds
:assert some           # error if no results
```

### 5.10 Fixed Rules (Built-in Algorithms)

```datalog
# PageRank
?[node, rank] <~ PageRank(*edges[], theta: 0.85)

# Shortest path
?[start, goal, cost, path] <~ ShortestPathDijkstra(*edges[], starting: ["A"], goals: ["Z"])

# Community detection
?[community, node] <~ CommunityDetectionLouvain(*edges[])

# Read CSV
?[idx, col1, col2] <~ CsvReader(url: "file://data.csv", types: ["Int", "String"])
```

Available algorithms: PageRank, ShortestPathDijkstra, ShortestPathBFS, ShortestPathAStar, KShortestPathYen, BFS, DFS, ConnectedComponents, StronglyConnectedComponent, MinimumSpanningForest/Tree, TopSort, CommunityDetectionLouvain, LabelPropagation, ClusteringCoefficients, DegreeCentrality, ClosenessCentrality, BetweennessCentrality, RandomWalk.

Utilities: Constant, ReorderSort, CsvReader, JsonReader.

---

## 6. Schema Definition and Data Model

### 6.1 Creating Relations

```datalog
:create relation_name {
    key_col1: Type,
    key_col2: Type,
    =>
    val_col1: Type,
    val_col2: Type default <expr>
}
```

- Columns before `=>` form the **composite primary key** (stored in sorted B-tree order)
- Columns after `=>` are **value columns**
- If `=>` is omitted, all columns are key columns
- Relations store as sorted trees with **no duplicate keys**

### 6.2 Data Types

| Type | Description |
|------|-------------|
| `Int` | 64-bit signed integer |
| `Float` | 64-bit double-precision float |
| `Bool` | Boolean |
| `String` | UTF-8 text |
| `Bytes` | Binary data |
| `Uuid` | UUID (v1 or v4) |
| `Json` | JSON structured data |
| `List` | Heterogeneous list |
| `Validity` | For time-travel (timestamp + assertion flag) |
| `<F32; N>` | F32 vector of dimension N |
| `<F64; N>` | F64 vector of dimension N |
| `Any` | Accept any non-null value |

Nullable variant: append `?` (e.g., `Int?`, `String?`, `Any?`)

Composite types:
- `[Int]` -- homogeneous list of Int
- `[Int; 10]` -- list of Int with length 10
- `(Int, Float, String)` -- fixed-length tuple

### 6.3 Data Manipulation

```datalog
# Insert/Upsert (replaces if key exists)
?[id, name, email] <- [[1, "Alice", "alice@ex.com"]]
:put users {id => name, email}

# Insert only (error if key exists)
?[id, name] <- [[3, "Charlie"]]
:insert users {id => name}

# Update specific columns (keeps other values)
?[id, name] <- [[1, "Alicia"]]
:update users {id => name}

# Remove by key
?[id] <- [[1]]
:rm users {id}

# Delete (error if key doesn't exist)
?[id] <- [[1]]
:delete users {id}

# Replace entire relation
?[id, name] <- [[1, "Alice"], [2, "Bob"]]
:replace users {id => name}
```

### 6.4 The `:returning` Option

```datalog
?[id, name] <- [[1, "Alice"]]
:put users {id => name}
:returning
```
Returns mutated rows with a `_kind` field: `"inserted"` or `"replaced"`.

### 6.5 Indices

```datalog
# Create index (reorders columns for efficient lookups)
::index create users:by_email {email, id}

# Query via index
?[email, id] := *users:by_email{email, id}

# Drop index
::index drop users:by_email
```

### 6.6 HNSW Vector Index

```datalog
::hnsw create embeddings:vec_idx {
    dim: 128,
    m: 50,
    dtype: F32,
    fields: [vec],
    distance: L2,        # L2, Cosine, or IP
    ef_construction: 20
}

# Vector similarity search
?[dist, id, vec] := ~embeddings:vec_idx{id, vec |
    query: $query_vec,
    k: 10,
    ef: 50,
    bind_distance: dist
}
```

### 6.7 Full-Text Search Index

Available since v0.7. Allows FTS indexing on string columns for text search within Datalog queries.

### 6.8 Time Travel

```datalog
# Create temporal relation (Validity must be last key column)
:create events {id: String, valid_at: Validity => data: String}

# Insert with assertion
?[id, valid_at, data] <- [["e1", "ASSERT", "event data"]]
:put events {id, valid_at => data}

# Query at specific time
?[id, data] := *events{id, data, @ "2024-01-15T00:00:00Z"}

# Retract
?[id, valid_at, data] <- [["e1", "RETRACT", ""]]
:put events {id, valid_at => data}
```

---

## 7. Transaction Model

- Each script execution runs in its own transaction
- Multi-statement atomic transactions via curly braces:
  ```datalog
  {
    ?[a, b] <- [[1, "one"]]
    :put rel {a => b}
  }
  {
    ?[a] <- [[2]]
    :rm rel {a}
  }
  ```
- MVCC (Multi-Version Concurrency Control) for isolation
- Snapshot reads: only committed or same-transaction data visible
- HTTP API supports explicit transaction sessions (`/transact` endpoint)

### Ephemeral Relations

Names starting with `_` are transaction-scoped temporary relations:

```datalog
{:create _temp {a: Int}}
{
    ?[a] := a = rand_int(1, 100)
    :put _temp {a}
}
```

### Control Flow in Transactions

```
%if <condition> %then ... %else ... %end
%loop ... %end
%break / %continue
%return
%debug <relation>
%ignore_error <query>
%swap <rel1> <rel2>
```

---

## 8. System Operations

```datalog
::relations                        # List all stored relations
::columns <rel>                    # View columns of a relation
::indices <rel>                    # View indices
::describe <rel>                   # Metadata/documentation
::remove <rel>                     # Drop a relation
::rename <old> -> <new>            # Rename a relation
::access_level normal|protected|read_only|hidden <rel>
::running                          # List running queries
::kill <id>                        # Kill a running query
::explain { <query> }              # Show execution plan
::compact                          # Optimize storage
::show_triggers <rel>              # View triggers
::set_triggers <rel> on put {...} on rm {...}
```

---

## 9. Performance Characteristics

Benchmarked on a 2020 Mac Mini with RocksDB:

| Workload | Performance |
|----------|-------------|
| OLTP queries | ~100K-250K queries/sec (1.6M rows) |
| OLAP full-table scan | ~1 second per 1.6M rows |
| 2-hop graph traversal | <1ms (1.6M vertices, 31M edges) |
| PageRank (1.6M vertices) | ~30 seconds |

### Optimization Notes

- **Key prefix optimization**: Queries are most efficient when bound variables form a prefix of the key columns. This determines whether a logarithmic range scan or full table scan is used.
- **Break queries into intermediate rules**: For multi-hop queries, intermediate rules deduplicate at each step, running "exponentially faster."
- **Magic set rewrites**: The engine automatically rewrites queries to avoid computing unnecessary results (applies to inline rules without aggregations).
- **Semi-naive evaluation**: Bottom-up strategy that avoids redundant computation in recursive rules.
- **Early stopping**: `:limit` without `:order` enables the engine to stop as soon as enough rows are found.
- **Large values**: Store in dedicated key-value relations; filter on metadata first, join large values last.

---

## 10. Comparison with Datomic/DataScript

| Feature | CozoDB | Datomic | DataScript |
|---------|--------|---------|------------|
| **Query Language** | CozoScript (Datalog dialect) | Datalog (EDN-based) | Datalog (EDN-based) |
| **Data Model** | Relations (tables with key/value columns) | EAV triples (Entity-Attribute-Value) | EAV triples |
| **Schema** | Explicit typed relations with key/value split | Attribute-level schema | Schema-less or attribute schema |
| **Time Travel** | Opt-in per relation via Validity type | Built-in (immutable log, `as-of` queries) | Not built-in |
| **Graph Queries** | Recursive Datalog + built-in algorithms | Recursive Datalog | Recursive Datalog |
| **Vector Search** | Built-in HNSW | No | No |
| **Full-Text Search** | Built-in FTS | Via Lucene integration | No |
| **Deployment** | Embedded or HTTP server | Client-server (JVM) | In-memory (JS/JVM) |
| **Storage** | mem/SQLite/RocksDB/TiKV | DynamoDB/PostgreSQL/other | In-memory |
| **Transactions** | ACID with MVCC | ACID with serialized writes | In-memory atoms |
| **Aggregation** | Built-in (count, sum, etc.) | Via `:with` and rules | Via `:with` and rules |
| **Language** | Rust | Clojure/Java | ClojureScript/JS |

### Query Syntax Comparison

**CozoDB** uses a **text-based** syntax:
```datalog
?[name, email] := *users{id: $target_id, name, email}
```

**Datomic** uses **EDN data structures**:
```clojure
[:find ?name ?email
 :in $ ?target-id
 :where [?target-id :user/name ?name]
        [?target-id :user/email ?email]]
```

Key differences:
- CozoDB: text syntax, explicit relations (tables), key/value column model, `*relation{...}` access
- Datomic: EDN syntax, EAV triples, entity-centric, `[entity attribute value]` patterns
- CozoDB has built-in graph algorithms as fixed rules; Datomic requires custom recursive rules
- CozoDB supports vector search natively; Datomic does not
- Datomic's time travel is automatic and immutable; CozoDB's is opt-in and requires explicit Validity columns
- CozoDB is embeddable anywhere (WASM, mobile, Go, etc.); Datomic requires JVM

---

## 11. Built-in Functions (Selected)

### Math
`add`, `sub`, `mul`, `div`, `mod`, `pow`, `abs`, `floor`, `ceil`, `round`, `sqrt`, `exp`, `ln`, `log2`, `log10`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `haversine`

### String
`length`, `concat`/`++`, `lowercase`, `uppercase`, `trim`, `starts_with`, `ends_with`, `str_includes`, `chars`, `unicode_normalize`

### Regex
`regex_matches`, `regex_replace`, `regex_replace_all`, `regex_extract`, `regex_extract_first`

### List
`list`, `first`, `last`, `get`, `length`, `slice`, `append`, `prepend`, `reverse`, `sorted`, `chunks`, `windows`, `union`, `intersection`, `difference`

### JSON
`json`, `json_object`, `parse_json`, `dump_json`, `get`/`->`, `set_json_path`, `remove_json_path`, `json_to_scalar`, `concat`/`++` (deep merge)

### Type
`is_null`, `is_int`, `is_float`, `is_num`, `is_string`, `is_list`, `is_uuid`, `is_json`, `to_string`, `to_float`, `to_int`, `to_bool`, `to_uuid`, `coalesce`/`~`

### Vector
`vec`, `rand_vec`, `l2_normalize`, `l2_dist`, `ip_dist`, `cos_dist`

### UUID/Time
`rand_uuid_v1`, `rand_uuid_v4`, `uuid_timestamp`, `now`, `format_timestamp`, `parse_timestamp`, `validity`

### Control
`if(cond, then, else)`, `cond(c1, v1, c2, v2, ...)`, `assert(x, msg...)`

---

## 12. Architecture for a Go Backend Wrapper

### Recommended Architecture

```
Go HTTP API (your backend)
    |
    |-- Option A: CGo FFI (embedded)
    |       |
    |       cozo-lib-go (github.com/cozodb/cozo-lib-go)
    |       |
    |       libcozo_c.a (pre-built static C library)
    |       |
    |       CozoDB engine (mem/sqlite/rocksdb)
    |
    |-- Option B: HTTP Client (standalone server)
            |
            HTTP requests to CozoDB server (/text-query, etc.)
            |
            cozoserver binary (separate process)
```

### Option A: Embedded via CGo (Recommended for single-server deployments)

**Pros**:
- Lowest latency (no network hop)
- Single binary deployment (with static linking)
- Full control over database lifecycle
- No auth complexity

**Cons**:
- CGo build complexity (need `libcozo_c.a` for target platform)
- Cross-compilation requires matching C library
- Larger binary size
- CGo overhead on each call (marshaling to/from JSON)

**Setup**:
```bash
# Download libcozo_c for your platform
curl -L https://github.com/cozodb/cozo/releases/download/v0.7.5/libcozo_c-0.7.5-x86_64-unknown-linux-gnu.a.gz | gunzip > libs/libcozo_c.a
export CGO_LDFLAGS="-L${PWD}/libs"
go get github.com/cozodb/cozo-lib-go
```

### Option B: HTTP Client (Recommended for distributed/multi-service deployments)

**Pros**:
- Pure Go (no CGo)
- Easy cross-compilation
- Database can run independently
- Multiple clients can connect
- SSE support for change notifications

**Cons**:
- Network latency per query
- Need to manage separate server process
- Auth token management
- Serialization overhead

**Implementation sketch**:
```go
type CozoHTTPClient struct {
    BaseURL   string
    AuthToken string
    Client    *http.Client
}

func (c *CozoHTTPClient) Query(script string, params map[string]any) (*QueryResult, error) {
    body := map[string]any{
        "script": script,
        "params": params,
    }
    // POST to /text-query with auth header
}
```

### Key Design Considerations

1. **Query Builder**: CozoScript is text-based. Build a Go library that safely constructs CozoScript strings with parameterization (use `$param_name` syntax and pass params via the params map).

2. **Schema Management**: Write migration scripts in CozoScript. Use `:create` for new relations, track applied migrations.

3. **Error Handling**: CozoDB returns JSON errors with `"ok": false`. Map these to Go error types.

4. **Connection Pooling**: With CGo FFI, a single `CozoDB` instance is thread-safe for reads. For the HTTP approach, use Go's standard `http.Client` with connection pooling.

5. **Result Mapping**: The Go bindings return `NamedRows` with `Headers` and `Rows`. Build a reflection-based or code-gen mapper to Go structs.

---

## 13. Limitations and Caveats

- **Pre-1.0**: No API or storage format stability guarantees between versions
- **Go bindings lag**: `cozo-lib-go` is at v0.7.5 while core is v0.7.6
- **CGo dependency**: The Go bindings require a pre-built C library, complicating builds
- **No ORM**: All queries are raw CozoScript strings
- **No schema migrations**: Must be handled manually
- **Single-writer**: CozoDB uses MVCC but writes are serialized
- **No built-in clustering**: Except via TiKV backend (which requires separate TiKV cluster)
- **Community size**: Small project; ~16 stars on Go bindings repo
- **Documentation**: Good but some areas (HTTP API, advanced patterns) are underdocumented
