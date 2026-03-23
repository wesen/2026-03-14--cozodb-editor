package notebook

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type SQLiteRuntimeConfig struct {
	DBPath string
}

type SQLiteRuntime struct {
	config     SQLiteRuntimeConfig
	db         *sql.DB
	generation int64
	mu         sync.RWMutex
}

type sqliteColumnInfo struct {
	name       string
	declType   string
	hasDefault bool
	isPrimary  bool
}

func OpenSQLiteRuntime(config SQLiteRuntimeConfig) (*SQLiteRuntime, error) {
	db, err := openSQLiteRuntimeDB(config)
	if err != nil {
		return nil, err
	}

	return &SQLiteRuntime{
		config:     config,
		db:         db,
		generation: 1,
	}, nil
}

func (r *SQLiteRuntime) Query(script string, _ map[string]any) (*RuntimeQueryResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.db == nil {
		return nil, fmt.Errorf("sqlite runtime is closed")
	}

	statements := splitSQLiteStatements(script)
	started := time.Now()
	if len(statements) == 0 {
		return &RuntimeQueryResult{
			OK:      true,
			Headers: []string{},
			Rows:    [][]any{},
			Took:    time.Since(started).Seconds(),
		}, nil
	}

	ctx := context.Background()
	for _, statement := range statements[:len(statements)-1] {
		if _, err := r.db.ExecContext(ctx, statement); err != nil {
			return nil, fmt.Errorf("execute statement %q: %w", statement, err)
		}
	}

	finalStatement := statements[len(statements)-1]
	if statementReturnsRows(finalStatement) {
		rows, err := r.db.QueryContext(ctx, finalStatement)
		if err != nil {
			return nil, fmt.Errorf("query statement %q: %w", finalStatement, err)
		}
		defer rows.Close()

		headers, values, err := collectSQLiteRows(rows)
		if err != nil {
			return nil, err
		}
		return &RuntimeQueryResult{
			OK:      true,
			Headers: headers,
			Rows:    values,
			Took:    time.Since(started).Seconds(),
		}, nil
	}

	result, err := r.db.ExecContext(ctx, finalStatement)
	if err != nil {
		return nil, fmt.Errorf("execute statement %q: %w", finalStatement, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		rowsAffected = 0
	}
	return &RuntimeQueryResult{
		OK:      true,
		Headers: []string{"status", "rows_affected"},
		Rows:    [][]any{{"ok", rowsAffected}},
		Took:    time.Since(started).Seconds(),
	}, nil
}

func (r *SQLiteRuntime) ListRelations() ([]string, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.db == nil {
		return nil, fmt.Errorf("sqlite runtime is closed")
	}

	rows, err := r.db.Query(`
select name
from sqlite_master
where type in ('table', 'view')
  and name not like 'sqlite_%'
order by name
`)
	if err != nil {
		return nil, fmt.Errorf("list sqlite relations: %w", err)
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, fmt.Errorf("scan relation name: %w", err)
		}
		names = append(names, name)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate sqlite relations: %w", err)
	}
	return names, nil
}

func (r *SQLiteRuntime) DescribeRelation(name string) (*RuntimeRelationInfo, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.db == nil {
		return nil, fmt.Errorf("sqlite runtime is closed")
	}

	exists, err := sqliteRelationExists(r.db, name)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, fmt.Errorf("runtime object %q not found", name)
	}

	columns, err := sqliteRelationColumns(r.db, name)
	if err != nil {
		return nil, err
	}

	info := &RuntimeRelationInfo{Name: name}
	for _, column := range columns {
		target := &info.Values
		if column.isPrimary {
			target = &info.Keys
		}
		*target = append(*target, RuntimeColumnInfo{
			Name:       column.name,
			Type:       sqliteColumnType(column.declType),
			HasDefault: column.hasDefault,
		})
	}
	return info, nil
}

func (r *SQLiteRuntime) GetSchema() (string, error) {
	names, err := r.ListRelations()
	if err != nil {
		return "", err
	}
	if len(names) == 0 {
		return "(no runtime objects)", nil
	}

	lines := make([]string, 0, len(names))
	for _, name := range names {
		info, err := r.DescribeRelation(name)
		if err != nil {
			lines = append(lines, fmt.Sprintf("%s: (error: %v)", name, err))
			continue
		}
		lines = append(lines, formatRuntimeRelation(info))
	}
	return strings.Join(lines, "\n"), nil
}

func (r *SQLiteRuntime) Reset() (int64, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.db == nil {
		return r.generation, fmt.Errorf("sqlite runtime is closed")
	}

	if err := r.db.Close(); err != nil {
		return r.generation, err
	}
	if err := removeSQLiteRuntimeDB(r.config); err != nil {
		return r.generation, err
	}

	db, err := openSQLiteRuntimeDB(r.config)
	if err != nil {
		return r.generation, err
	}

	r.db = db
	r.generation++
	return r.generation, nil
}

func (r *SQLiteRuntime) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.db == nil {
		return nil
	}

	err := r.db.Close()
	r.db = nil
	return err
}

func openSQLiteRuntimeDB(config SQLiteRuntimeConfig) (*sql.DB, error) {
	dsn := config.DBPath
	if dsn == "" {
		dsn = fmt.Sprintf("file:sqlite-notebook-runtime-%s?mode=memory&cache=shared", uuid.NewString())
	} else if err := os.MkdirAll(filepath.Dir(config.DBPath), 0o755); err != nil {
		return nil, fmt.Errorf("create sqlite runtime directory: %w", err)
	}

	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite runtime: %w", err)
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	if _, err := db.Exec(`pragma foreign_keys = on`); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("configure sqlite runtime pragmas: %w", err)
	}
	return db, nil
}

func removeSQLiteRuntimeDB(config SQLiteRuntimeConfig) error {
	if config.DBPath == "" {
		return nil
	}
	if err := os.Remove(config.DBPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove sqlite runtime db: %w", err)
	}
	return nil
}

func collectSQLiteRows(rows *sql.Rows) ([]string, [][]any, error) {
	headers, err := rows.Columns()
	if err != nil {
		return nil, nil, fmt.Errorf("sqlite rows columns: %w", err)
	}

	values := make([][]any, 0)
	for rows.Next() {
		rawValues := make([]any, len(headers))
		scanTargets := make([]any, len(headers))
		for i := range rawValues {
			scanTargets[i] = &rawValues[i]
		}
		if err := rows.Scan(scanTargets...); err != nil {
			return nil, nil, fmt.Errorf("scan sqlite row: %w", err)
		}

		row := make([]any, len(rawValues))
		for i, value := range rawValues {
			row[i] = normalizeSQLiteValue(value)
		}
		values = append(values, row)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, fmt.Errorf("iterate sqlite rows: %w", err)
	}
	return headers, values, nil
}

func normalizeSQLiteValue(value any) any {
	switch typed := value.(type) {
	case []byte:
		return string(typed)
	default:
		return typed
	}
}

func sqliteRelationExists(db *sql.DB, name string) (bool, error) {
	var count int
	err := db.QueryRow(`
select count(*)
from sqlite_master
where type in ('table', 'view')
  and name = ?
`, name).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("check sqlite relation %q: %w", name, err)
	}
	return count > 0, nil
}

func sqliteRelationColumns(db *sql.DB, name string) ([]sqliteColumnInfo, error) {
	query := fmt.Sprintf("pragma table_info(%s)", quoteSQLiteIdentifier(name))
	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("describe sqlite relation %q: %w", name, err)
	}
	defer rows.Close()

	columns := []sqliteColumnInfo{}
	for rows.Next() {
		var (
			cid        int
			columnName string
			declType   string
			notNull    int
			defaultVal sql.NullString
			primaryKey int
		)
		if err := rows.Scan(&cid, &columnName, &declType, &notNull, &defaultVal, &primaryKey); err != nil {
			return nil, fmt.Errorf("scan sqlite column: %w", err)
		}
		columns = append(columns, sqliteColumnInfo{
			name:       columnName,
			declType:   declType,
			hasDefault: defaultVal.Valid,
			isPrimary:  primaryKey > 0,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate sqlite columns: %w", err)
	}
	return columns, nil
}

func sqliteColumnType(declType string) string {
	if strings.TrimSpace(declType) == "" {
		return "any"
	}
	return strings.ToLower(strings.TrimSpace(declType))
}

func quoteSQLiteIdentifier(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func splitSQLiteStatements(script string) []string {
	statements := make([]string, 0)
	var builder strings.Builder

	inSingle := false
	inDouble := false
	inBacktick := false
	inBracket := false
	inLineComment := false
	inBlockComment := false

	for i := 0; i < len(script); i += 1 {
		ch := script[i]
		next := byte(0)
		if i+1 < len(script) {
			next = script[i+1]
		}

		switch {
		case inLineComment:
			builder.WriteByte(ch)
			if ch == '\n' {
				inLineComment = false
			}
		case inBlockComment:
			builder.WriteByte(ch)
			if ch == '*' && next == '/' {
				builder.WriteByte(next)
				i += 1
				inBlockComment = false
			}
		case inSingle:
			builder.WriteByte(ch)
			if ch == '\'' {
				if next == '\'' {
					builder.WriteByte(next)
					i += 1
				} else {
					inSingle = false
				}
			}
		case inDouble:
			builder.WriteByte(ch)
			if ch == '"' {
				if next == '"' {
					builder.WriteByte(next)
					i += 1
				} else {
					inDouble = false
				}
			}
		case inBacktick:
			builder.WriteByte(ch)
			if ch == '`' {
				inBacktick = false
			}
		case inBracket:
			builder.WriteByte(ch)
			if ch == ']' {
				inBracket = false
			}
		case ch == '-' && next == '-':
			builder.WriteByte(ch)
			builder.WriteByte(next)
			i += 1
			inLineComment = true
		case ch == '/' && next == '*':
			builder.WriteByte(ch)
			builder.WriteByte(next)
			i += 1
			inBlockComment = true
		case ch == '\'':
			builder.WriteByte(ch)
			inSingle = true
		case ch == '"':
			builder.WriteByte(ch)
			inDouble = true
		case ch == '`':
			builder.WriteByte(ch)
			inBacktick = true
		case ch == '[':
			builder.WriteByte(ch)
			inBracket = true
		case ch == ';':
			statement := strings.TrimSpace(builder.String())
			if statement != "" {
				statements = append(statements, statement)
			}
			builder.Reset()
		default:
			builder.WriteByte(ch)
		}
	}

	statement := strings.TrimSpace(builder.String())
	if statement != "" {
		statements = append(statements, statement)
	}
	return statements
}

func statementReturnsRows(statement string) bool {
	trimmed := stripLeadingSQLComments(statement)
	firstWord := strings.ToUpper(firstSQLWord(trimmed))
	switch firstWord {
	case "SELECT", "WITH", "PRAGMA", "EXPLAIN", "VALUES":
		return true
	default:
		return false
	}
}

func stripLeadingSQLComments(statement string) string {
	trimmed := strings.TrimSpace(statement)
	for {
		switch {
		case strings.HasPrefix(trimmed, "--"):
			newline := strings.IndexByte(trimmed, '\n')
			if newline < 0 {
				return ""
			}
			trimmed = strings.TrimSpace(trimmed[newline+1:])
		case strings.HasPrefix(trimmed, "/*"):
			end := strings.Index(trimmed, "*/")
			if end < 0 {
				return ""
			}
			trimmed = strings.TrimSpace(trimmed[end+2:])
		default:
			return trimmed
		}
	}
}

func firstSQLWord(statement string) string {
	for i, r := range statement {
		if r == ' ' || r == '\n' || r == '\t' || r == '\r' {
			return statement[:i]
		}
	}
	return statement
}
