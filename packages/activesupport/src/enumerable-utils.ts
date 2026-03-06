/**
 * Enumerable utilities mirroring Rails ActiveSupport enumerable extensions.
 */

import { isBlank } from "./string-utils.js";

/**
 * Sum the collection, optionally mapping each element first.
 */
export function sum<T>(collection: T[], fn?: (item: T) => number): number {
  if (fn) {
    return collection.reduce((acc, item) => acc + fn(item), 0);
  }
  return collection.reduce((acc, item) => acc + (item as unknown as number), 0);
}

/**
 * Index a collection by a key function. Last value wins for duplicate keys.
 */
export function indexBy<T, K extends string | number>(
  collection: T[],
  fn: (item: T) => K
): Record<K, T> {
  const result = {} as Record<K, T>;
  for (const item of collection) {
    result[fn(item)] = item;
  }
  return result;
}

/**
 * Group a collection by a key function.
 */
export function groupBy<T, K extends string | number>(
  collection: T[],
  fn: (item: T) => K
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of collection) {
    const key = fn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

/**
 * Extract a single property from each element.
 */
export function pluck<T, K extends keyof T>(collection: T[], key: K): T[K][] {
  return collection.map((item) => item[key]);
}

/**
 * Find the maximum value in a collection using a mapper function.
 */
export function maximum<T>(collection: T[], fn: (item: T) => number): number | undefined {
  if (collection.length === 0) return undefined;
  return Math.max(...collection.map(fn));
}

/**
 * Find the minimum value in a collection using a mapper function.
 */
export function minimum<T>(collection: T[], fn: (item: T) => number): number | undefined {
  if (collection.length === 0) return undefined;
  return Math.min(...collection.map(fn));
}

/**
 * Yield chunks of the given size.
 */
export function inBatchesOf<T>(collection: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < collection.length; i += size) {
    result.push(collection.slice(i, i + size));
  }
  return result;
}

/**
 * Remove blank values from a collection (using ActiveSupport's isBlank).
 */
export function compactBlank<T>(collection: T[]): T[] {
  return collection.filter((item) => !isBlank(item));
}
