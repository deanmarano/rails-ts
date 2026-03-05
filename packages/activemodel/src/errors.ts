/**
 * Error detail stored in the Errors collection.
 */
export interface ErrorDetail {
  attribute: string;
  type: string;
  message: string;
  options?: Record<string, unknown>;
}

/**
 * Errors — collects validation error messages on a model.
 *
 * Mirrors: ActiveModel::Errors
 */
export class Errors {
  private _errors: ErrorDetail[] = [];

  /**
   * Add an error for an attribute.
   */
  add(
    attribute: string,
    type: string = "invalid",
    options?: { message?: string } & Record<string, unknown>
  ): void {
    const message = options?.message ?? this.defaultMessage(type, options);
    this._errors.push({ attribute, type, message, options });
  }

  /**
   * Get error messages for a specific attribute.
   */
  get(attribute: string): string[] {
    return this._errors
      .filter((e) => e.attribute === attribute)
      .map((e) => e.message);
  }

  /**
   * Bracket accessor — alias for get().
   */
  on(attribute: string): string[] {
    return this.get(attribute);
  }

  /**
   * Filter errors by attribute and/or type.
   */
  where(
    attribute: string,
    type?: string
  ): ErrorDetail[] {
    return this._errors.filter(
      (e) =>
        e.attribute === attribute && (type === undefined || e.type === type)
    );
  }

  /**
   * All full messages: "Attribute message".
   */
  get fullMessages(): string[] {
    return this._errors.map((e) => {
      if (e.attribute === "base") return e.message;
      const attr = e.attribute.charAt(0).toUpperCase() + e.attribute.slice(1);
      return `${attr} ${e.message}`;
    });
  }

  /**
   * Number of errors.
   */
  get count(): number {
    return this._errors.length;
  }

  get size(): number {
    return this._errors.length;
  }

  /**
   * Whether there are any errors.
   */
  get any(): boolean {
    return this._errors.length > 0;
  }

  get empty(): boolean {
    return this._errors.length === 0;
  }

  /**
   * Clear all errors.
   */
  clear(): void {
    this._errors = [];
  }

  /**
   * Get all error details.
   */
  get details(): ErrorDetail[] {
    return [...this._errors];
  }

  /**
   * All attribute names that have errors.
   */
  get attributeNames(): string[] {
    return [...new Set(this._errors.map((e) => e.attribute))];
  }

  /**
   * Full messages for a specific attribute.
   *
   * Mirrors: ActiveModel::Errors#full_messages_for
   */
  fullMessagesFor(attribute: string): string[] {
    return this._errors
      .filter((e) => e.attribute === attribute)
      .map((e) => {
        if (e.attribute === "base") return e.message;
        const attr = e.attribute.charAt(0).toUpperCase() + e.attribute.slice(1);
        return `${attr} ${e.message}`;
      });
  }

  /**
   * Check if an error of a specific kind exists for an attribute.
   *
   * Mirrors: ActiveModel::Errors#of_kind?
   */
  ofKind(attribute: string, type?: string): boolean {
    if (type === undefined) {
      return this._errors.some((e) => e.attribute === attribute);
    }
    return this._errors.some(
      (e) => e.attribute === attribute && e.type === type
    );
  }

  /**
   * Check if a specific error has already been added.
   *
   * Mirrors: ActiveModel::Errors#added?
   */
  added(attribute: string, type: string = "invalid", options?: Record<string, unknown>): boolean {
    return this._errors.some(
      (e) => e.attribute === attribute && e.type === type
    );
  }

  /**
   * Delete errors for an attribute, optionally filtering by type.
   *
   * Mirrors: ActiveModel::Errors#delete
   */
  delete(attribute: string, type?: string): ErrorDetail[] {
    const removed: ErrorDetail[] = [];
    this._errors = this._errors.filter((e) => {
      if (e.attribute === attribute && (type === undefined || e.type === type)) {
        removed.push(e);
        return false;
      }
      return true;
    });
    return removed;
  }

  /**
   * Iterate over each error.
   *
   * Mirrors: ActiveModel::Errors#each
   */
  each(fn: (error: ErrorDetail) => void): void {
    for (const error of this._errors) {
      fn(error);
    }
  }

  /**
   * Copy errors from another Errors instance.
   *
   * Mirrors: ActiveModel::Errors#copy!
   */
  copy(other: Errors): void {
    for (const error of other._errors) {
      this._errors.push({ ...error });
    }
  }

  /**
   * Merge errors from another Errors instance (alias for copy).
   *
   * Mirrors: ActiveModel::Errors#merge!
   */
  merge(other: Errors): void {
    this.copy(other);
  }

  /**
   * Group error messages by attribute.
   *
   * Mirrors: ActiveModel::Errors#to_hash
   */
  toHash(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const error of this._errors) {
      if (!result[error.attribute]) {
        result[error.attribute] = [];
      }
      result[error.attribute].push(error.message);
    }
    return result;
  }

  /**
   * Check if there are errors for a specific attribute.
   *
   * Mirrors: ActiveModel::Errors#include?
   */
  include(attribute: string): boolean {
    return this._errors.some((e) => e.attribute === attribute);
  }

  /**
   * Return the errors as an array of [attribute, message] pairs.
   *
   * Mirrors: ActiveModel::Errors#to_a (alias for full_messages)
   */
  toArray(): string[] {
    return this.fullMessages;
  }

  /**
   * Generate a full error message for an attribute and message.
   *
   * Mirrors: ActiveModel::Errors#full_message
   */
  fullMessage(attribute: string, message: string): string {
    if (attribute === "base") return message;
    const attr = attribute.charAt(0).toUpperCase() + attribute.slice(1);
    return `${attr} ${message}`;
  }

  /**
   * Return all error messages as a flat array.
   *
   * Mirrors: ActiveModel::Errors#messages (as flat list)
   */
  get messages(): Record<string, string[]> {
    return this.toHash();
  }

  private defaultMessage(
    type: string,
    _options?: Record<string, unknown>
  ): string {
    const messages: Record<string, string> = {
      invalid: "is invalid",
      blank: "can't be blank",
      present: "must be blank",
      too_short: "is too short",
      too_long: "is too long",
      wrong_length: "is the wrong length",
      not_a_number: "is not a number",
      not_an_integer: "is not an integer",
      greater_than: "must be greater than %{count}",
      greater_than_or_equal_to: "must be greater than or equal to %{count}",
      less_than: "must be less than %{count}",
      less_than_or_equal_to: "must be less than or equal to %{count}",
      equal_to: "must be equal to %{count}",
      other_than: "must be other than %{count}",
      odd: "must be odd",
      even: "must be even",
      inclusion: "is not included in the list",
      exclusion: "is reserved",
      taken: "has already been taken",
      confirmation: "doesn't match confirmation",
      accepted: "must be accepted",
    };
    let msg = messages[type] ?? type;
    if (_options) {
      for (const [key, val] of Object.entries(_options)) {
        msg = msg.replace(`%{${key}}`, String(val));
      }
    }
    return msg;
  }
}
