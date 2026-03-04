# Phase 2700: ActiveRecord PostgreSQL Adapter

## Goal

Implement a PostgreSQL adapter using the `pg` package.

## Scope

- `PostgresAdapter` implementing the `DatabaseAdapter` interface
- Connection management with connection string or config object
- Real transaction and savepoint support
- PostgreSQL-specific type mappings (jsonb, array, uuid, etc.)
- Parameterized queries with `$1, $2, ...` bind syntax
- Connection pooling interface

## Dependencies

- `pg` npm package

## Rails Reference

- https://api.rubyonrails.org/classes/ActiveRecord/ConnectionAdapters/PostgreSQLAdapter.html
