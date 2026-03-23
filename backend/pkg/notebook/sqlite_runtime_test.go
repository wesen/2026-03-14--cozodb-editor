package notebook

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSQLiteRuntimeQuerySupportsMultiStatementScripts(t *testing.T) {
	runtime, err := OpenSQLiteRuntime(SQLiteRuntimeConfig{})
	require.NoError(t, err)
	t.Cleanup(func() { _ = runtime.Close() })

	result, err := runtime.Query(`
create table users (
  id integer primary key,
  name text not null,
  age integer not null
);

insert into users (name, age)
values ('Ada', 31), ('Grace', 42);

select name, age from users order by age desc;
`, nil)
	require.NoError(t, err)
	require.Equal(t, []string{"name", "age"}, result.Headers)
	require.Equal(t, [][]any{{"Grace", int64(42)}, {"Ada", int64(31)}}, result.Rows)
}

func TestSQLiteRuntimeDescribeRelationAndSchema(t *testing.T) {
	runtime, err := OpenSQLiteRuntime(SQLiteRuntimeConfig{})
	require.NoError(t, err)
	t.Cleanup(func() { _ = runtime.Close() })

	_, err = runtime.Query(`
create table users (
  id integer primary key,
  name text not null,
  age integer default 0
);
`, nil)
	require.NoError(t, err)

	names, err := runtime.ListRelations()
	require.NoError(t, err)
	require.Equal(t, []string{"users"}, names)

	info, err := runtime.DescribeRelation("users")
	require.NoError(t, err)
	require.Len(t, info.Keys, 1)
	require.Equal(t, "id", info.Keys[0].Name)
	require.Len(t, info.Values, 2)
	require.Equal(t, "name", info.Values[0].Name)
	require.Equal(t, "text", info.Values[0].Type)
	require.True(t, info.Values[1].HasDefault)

	schema, err := runtime.GetSchema()
	require.NoError(t, err)
	require.Contains(t, schema, "users:")
	require.Contains(t, schema, "key id:integer")
}

func TestSQLiteRuntimeResetClearsRuntimeState(t *testing.T) {
	runtime, err := OpenSQLiteRuntime(SQLiteRuntimeConfig{})
	require.NoError(t, err)
	t.Cleanup(func() { _ = runtime.Close() })

	_, err = runtime.Query(`
create table users (id integer primary key, name text);
insert into users (name) values ('Ada');
`, nil)
	require.NoError(t, err)

	namesBeforeReset, err := runtime.ListRelations()
	require.NoError(t, err)
	require.Contains(t, namesBeforeReset, "users")

	generation, err := runtime.Reset()
	require.NoError(t, err)
	require.Equal(t, int64(2), generation)

	namesAfterReset, err := runtime.ListRelations()
	require.NoError(t, err)
	require.Empty(t, namesAfterReset)
}
