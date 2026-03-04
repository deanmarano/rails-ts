# Phase 2600: ActiveRecord SQLite Adapter

## Goal

Implement a real SQLite adapter using `better-sqlite3`, giving ActiveRecord
models the ability to persist to an actual SQLite database.

## Scope

- `SqliteAdapter` implementing the `DatabaseAdapter` interface
- Connection management (open, close)
- Real transaction support (BEGIN, COMMIT, ROLLBACK)
- Savepoint support
- CREATE TABLE DDL execution for migrations
- Proper SQL execution with bind parameters
- Column type mapping (SQLite's dynamic typing)

## Dependencies

- `better-sqlite3` npm package

## Rails Reference

- https://api.rubyonrails.org/classes/ActiveRecord/ConnectionAdapters/SQLite3Adapter.html
