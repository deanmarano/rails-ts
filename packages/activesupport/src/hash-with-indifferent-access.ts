/**
 * HashWithIndifferentAccess — a Map-like class where string keys are
 * normalized so that camelCase and snake_case (or any variation) are NOT
 * conflated. This mirrors Rails' HashWithIndifferentAccess where string
 * and symbol keys are interchangeable. In TypeScript, since we only have
 * strings, the main value is the consistent Map-based API with merge,
 * slice, except, and deepMerge support.
 */

import { deepMerge as deepMergeObj } from "./hash-utils.js";

type AnyObject = Record<string, unknown>;

export class HashWithIndifferentAccess<V = unknown> {
  private data: Map<string, V>;

  constructor(obj?: AnyObject | Map<string, V>) {
    this.data = new Map();
    if (obj) {
      if (obj instanceof Map) {
        for (const [key, value] of obj) {
          this.data.set(String(key), value);
        }
      } else {
        for (const key of Object.keys(obj)) {
          this.data.set(key, obj[key] as V);
        }
      }
    }
  }

  get(key: string): V | undefined {
    return this.data.get(key);
  }

  set(key: string, value: V): this {
    this.data.set(key, value);
    return this;
  }

  delete(key: string): boolean {
    return this.data.delete(key);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  get size(): number {
    return this.data.size;
  }

  keys(): IterableIterator<string> {
    return this.data.keys();
  }

  values(): IterableIterator<V> {
    return this.data.values();
  }

  entries(): IterableIterator<[string, V]> {
    return this.data.entries();
  }

  forEach(fn: (value: V, key: string) => void): void {
    this.data.forEach(fn);
  }

  /**
   * Merge another object or HashWithIndifferentAccess, returning a new instance.
   */
  merge(other: AnyObject | HashWithIndifferentAccess<V>): HashWithIndifferentAccess<V> {
    const result = new HashWithIndifferentAccess<V>();
    for (const [k, v] of this.data) {
      result.set(k, v);
    }
    if (other instanceof HashWithIndifferentAccess) {
      for (const [k, v] of other.entries()) {
        result.set(k, v);
      }
    } else {
      for (const key of Object.keys(other)) {
        result.set(key, other[key] as V);
      }
    }
    return result;
  }

  /**
   * Deep merge, recursively merging nested objects.
   */
  deepMerge(other: AnyObject | HashWithIndifferentAccess<V>): HashWithIndifferentAccess<V> {
    const selfObj = this.toHash();
    const otherObj =
      other instanceof HashWithIndifferentAccess ? other.toHash() : other;
    const merged = deepMergeObj(selfObj, otherObj as AnyObject);
    return new HashWithIndifferentAccess<V>(merged);
  }

  /**
   * Return a new HashWithIndifferentAccess with only the specified keys.
   */
  slice(...keys: string[]): HashWithIndifferentAccess<V> {
    const result = new HashWithIndifferentAccess<V>();
    for (const key of keys) {
      if (this.data.has(key)) {
        result.set(key, this.data.get(key)!);
      }
    }
    return result;
  }

  /**
   * Return a new HashWithIndifferentAccess without the specified keys.
   */
  except(...keys: string[]): HashWithIndifferentAccess<V> {
    const keySet = new Set(keys);
    const result = new HashWithIndifferentAccess<V>();
    for (const [k, v] of this.data) {
      if (!keySet.has(k)) {
        result.set(k, v);
      }
    }
    return result;
  }

  /**
   * Return a plain object with all string keys (Rails' stringify_keys).
   * Returns a new HashWithIndifferentAccess since all keys are already strings.
   */
  stringifyKeys(): HashWithIndifferentAccess<V> {
    return new HashWithIndifferentAccess<V>(this.toHash());
  }

  /**
   * Return a plain object with all string keys (Rails' symbolize_keys).
   * In TS all keys are already strings; returns a plain object.
   */
  symbolizeKeys(): AnyObject {
    return this.toHash();
  }

  /**
   * Convert back to a plain object.
   */
  toHash(): AnyObject {
    const result: AnyObject = {};
    for (const [k, v] of this.data) {
      result[k] = v;
    }
    return result;
  }
}
