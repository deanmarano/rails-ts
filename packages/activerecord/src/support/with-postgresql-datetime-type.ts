export async function withPostgresqlDatetimeType<T>(
  type: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  const { PostgreSQLAdapter } = await import("../connection-adapters/postgresql-adapter.js");
  removeNativeDatabaseTypesMemo(PostgreSQLAdapter);
  const datetimeTypeWas = PostgreSQLAdapter.datetimeType;
  PostgreSQLAdapter.datetimeType = type;
  try {
    return await fn();
  } finally {
    PostgreSQLAdapter.datetimeType = datetimeTypeWas;
    removeNativeDatabaseTypesMemo(PostgreSQLAdapter);
  }
}

export function removeNativeDatabaseTypesMemo(adapter: unknown): void {
  (adapter as { _nativeDatabaseTypes?: unknown })._nativeDatabaseTypes = undefined;
}
