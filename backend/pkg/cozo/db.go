package cozo

/*
#include <stdlib.h>
#include <string.h>
#include "cozo_c.h"

#cgo LDFLAGS: -L${SRCDIR}/../../lib -lcozo_c -lstdc++ -lm -ldl -lpthread
*/
import "C"

import (
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"unsafe"
)

// DB wraps a CozoDB database instance.
type DB struct {
	id     C.int32_t
	mu     sync.RWMutex
	closed bool
}

// QueryResult holds the result of a CozoScript query.
type QueryResult struct {
	OK      bool       `json:"ok"`
	Headers []string   `json:"headers,omitempty"`
	Rows    [][]any    `json:"rows,omitempty"`
	Took    float64    `json:"took,omitempty"`
	Code    string     `json:"code,omitempty"`
	Message string     `json:"message,omitempty"`
	Display string     `json:"display,omitempty"`
}

// RelationInfo describes a stored relation.
type RelationInfo struct {
	Name    string         `json:"name"`
	Keys    []ColumnInfo   `json:"keys"`
	Values  []ColumnInfo   `json:"values"`
}

// ColumnInfo describes a column in a relation.
type ColumnInfo struct {
	Name    string `json:"name"`
	Type    string `json:"type"`
	HasDefault bool `json:"has_default"`
}

// NewDB opens a CozoDB database with the given engine and path.
// Use engine "mem" for in-memory, "sqlite" for file-backed.
func NewDB(engine, path string) (*DB, error) {
	cEngine := C.CString(engine)
	defer C.free(unsafe.Pointer(cEngine))

	cPath := C.CString(path)
	defer C.free(unsafe.Pointer(cPath))

	cOptions := C.CString("{}")
	defer C.free(unsafe.Pointer(cOptions))

	var dbID C.int32_t
	errPtr := C.cozo_open_db(cEngine, cPath, cOptions, &dbID)
	if errPtr != nil {
		errMsg := C.GoString(errPtr)
		C.cozo_free_str(errPtr)
		return nil, errors.New(errMsg)
	}

	return &DB{id: dbID}, nil
}

// Query executes a CozoScript query and returns the parsed result.
func (db *DB) Query(script string, params map[string]any) (*QueryResult, error) {
	db.mu.RLock()
	defer db.mu.RUnlock()

	if db.closed {
		return nil, errors.New("database is closed")
	}

	cScript := C.CString(script)
	defer C.free(unsafe.Pointer(cScript))

	paramsJSON := "{}"
	if len(params) > 0 {
		b, err := json.Marshal(params)
		if err != nil {
			return nil, fmt.Errorf("marshal params: %w", err)
		}
		paramsJSON = string(b)
	}
	cParams := C.CString(paramsJSON)
	defer C.free(unsafe.Pointer(cParams))

	resultPtr := C.cozo_run_query(db.id, cScript, cParams, C.bool(false))
	if resultPtr == nil {
		return nil, errors.New("cozo_run_query returned null")
	}
	resultJSON := C.GoString(resultPtr)
	C.cozo_free_str(resultPtr)

	var result QueryResult
	if err := json.Unmarshal([]byte(resultJSON), &result); err != nil {
		return nil, fmt.Errorf("parse result: %w", err)
	}
	return &result, nil
}

// RawQuery executes a query and returns the raw JSON string.
func (db *DB) RawQuery(script string, params map[string]any) (string, error) {
	db.mu.RLock()
	defer db.mu.RUnlock()

	if db.closed {
		return "", errors.New("database is closed")
	}

	cScript := C.CString(script)
	defer C.free(unsafe.Pointer(cScript))

	paramsJSON := "{}"
	if len(params) > 0 {
		b, err := json.Marshal(params)
		if err != nil {
			return "", fmt.Errorf("marshal params: %w", err)
		}
		paramsJSON = string(b)
	}
	cParams := C.CString(paramsJSON)
	defer C.free(unsafe.Pointer(cParams))

	resultPtr := C.cozo_run_query(db.id, cScript, cParams, C.bool(false))
	if resultPtr == nil {
		return "", errors.New("cozo_run_query returned null")
	}
	resultJSON := C.GoString(resultPtr)
	C.cozo_free_str(resultPtr)

	return resultJSON, nil
}

// ListRelations returns the names of all stored relations.
func (db *DB) ListRelations() ([]string, error) {
	result, err := db.Query("::relations", nil)
	if err != nil {
		return nil, err
	}
	if !result.OK {
		return nil, fmt.Errorf("list relations: %s", result.Message)
	}

	var names []string
	// The ::relations query returns rows with the relation name in the first column
	for _, row := range result.Rows {
		if len(row) > 0 {
			if name, ok := row[0].(string); ok {
				names = append(names, name)
			}
		}
	}
	return names, nil
}

// DescribeRelation returns column info for a stored relation.
func (db *DB) DescribeRelation(name string) (*RelationInfo, error) {
	result, err := db.Query(fmt.Sprintf("::columns %s", name), nil)
	if err != nil {
		return nil, err
	}
	if !result.OK {
		return nil, fmt.Errorf("describe relation: %s", result.Message)
	}

	info := &RelationInfo{Name: name}

	// ::columns returns: column, is_key, index, type, has_default
	for _, row := range result.Rows {
		if len(row) < 5 {
			continue
		}
		col := ColumnInfo{
			Name: fmt.Sprintf("%v", row[0]),
			Type: fmt.Sprintf("%v", row[3]),
		}
		if hd, ok := row[4].(bool); ok {
			col.HasDefault = hd
		}
		isKey := false
		if ik, ok := row[1].(bool); ok {
			isKey = ik
		}
		if isKey {
			info.Keys = append(info.Keys, col)
		} else {
			info.Values = append(info.Values, col)
		}
	}
	return info, nil
}

// GetSchema returns a text description of all relations and their columns.
func (db *DB) GetSchema() (string, error) {
	names, err := db.ListRelations()
	if err != nil {
		return "", err
	}
	if len(names) == 0 {
		return "(no stored relations)", nil
	}

	var schema string
	for _, name := range names {
		info, err := db.DescribeRelation(name)
		if err != nil {
			schema += fmt.Sprintf("%s: (error: %v)\n", name, err)
			continue
		}
		schema += fmt.Sprintf("%s {", name)
		for i, k := range info.Keys {
			if i > 0 {
				schema += ", "
			}
			schema += fmt.Sprintf("%s: %s", k.Name, k.Type)
		}
		if len(info.Values) > 0 {
			schema += " => "
			for i, v := range info.Values {
				if i > 0 {
					schema += ", "
				}
				schema += fmt.Sprintf("%s: %s", v.Name, v.Type)
			}
		}
		schema += "}\n"
	}
	return schema, nil
}

// Close closes the database.
func (db *DB) Close() {
	db.mu.Lock()
	defer db.mu.Unlock()

	if !db.closed {
		db.closed = true
		C.cozo_close_db(db.id)
	}
}
