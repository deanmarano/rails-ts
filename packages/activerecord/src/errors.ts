/**
 * ActiveRecord error classes.
 *
 * Mirrors: ActiveRecord::RecordNotFound, ActiveRecord::RecordInvalid, etc.
 */

/**
 * Raised when a record cannot be found by primary key or conditions.
 *
 * Mirrors: ActiveRecord::RecordNotFound
 */
export class RecordNotFound extends Error {
  readonly model: string;
  readonly primaryKey?: string;
  readonly id?: unknown;

  constructor(message: string, model?: string, primaryKey?: string, id?: unknown) {
    super(message);
    this.name = "RecordNotFound";
    this.model = model ?? "Record";
    this.primaryKey = primaryKey;
    this.id = id;
  }
}

/**
 * Raised when a record fails validation and save! or create! is called.
 *
 * Mirrors: ActiveRecord::RecordInvalid
 */
export class RecordInvalid extends Error {
  readonly record: any;

  constructor(record: any) {
    const messages = record.errors?.fullMessages?.join(", ") ?? "Validation failed";
    super(`Validation failed: ${messages}`);
    this.name = "RecordInvalid";
    this.record = record;
  }
}

/**
 * Raised when a record cannot be saved.
 *
 * Mirrors: ActiveRecord::RecordNotSaved
 */
export class RecordNotSaved extends Error {
  readonly record: any;

  constructor(message: string, record?: any) {
    super(message);
    this.name = "RecordNotSaved";
    this.record = record;
  }
}

/**
 * Raised when a record cannot be destroyed.
 *
 * Mirrors: ActiveRecord::RecordNotDestroyed
 */
export class RecordNotDestroyed extends Error {
  readonly record: any;

  constructor(message: string, record?: any) {
    super(message);
    this.name = "RecordNotDestroyed";
    this.record = record;
  }
}

/**
 * Raised when a record is stale (optimistic locking conflict).
 *
 * Mirrors: ActiveRecord::StaleObjectError
 */
export class StaleObjectError extends Error {
  readonly record: any;

  constructor(record: any, attemptedAction: string) {
    const model = record?.constructor?.name ?? "Record";
    super(`StaleObjectError: Attempted to ${attemptedAction} a stale ${model}. The record has been modified by another process.`);
    this.name = "StaleObjectError";
    this.record = record;
  }
}

/**
 * Raised when attempting to modify a readonly record.
 *
 * Mirrors: ActiveRecord::ReadOnlyRecord
 */
export class ReadOnlyRecord extends Error {
  readonly record: any;

  constructor(record?: any) {
    const model = record?.constructor?.name ?? "Record";
    super(`${model} is marked as readonly`);
    this.name = "ReadOnlyRecord";
    this.record = record;
  }
}
