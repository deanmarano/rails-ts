/**
 * Array utilities mirroring Rails ActiveSupport array extensions.
 */

/**
 * Wraps a value in an array. `null`/`undefined` → `[]`, arrays pass through,
 * scalars become `[value]`.
 */
export function wrap<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  return [value] as T[];
}

/**
 * Split an array into groups of `n`, padding the last group with `fillWith`.
 */
export function inGroupsOf<T>(
  array: T[],
  n: number,
  fillWith: T | null = null
): (T | null)[][] {
  const result: (T | null)[][] = [];
  for (let i = 0; i < array.length; i += n) {
    const group: (T | null)[] = array.slice(i, i + n);
    while (group.length < n) {
      group.push(fillWith);
    }
    result.push(group);
  }
  return result;
}

/**
 * Convert an array to a sentence string.
 * `["a", "b", "c"]` → `"a, b, and c"`
 */
export function toSentence(
  array: string[],
  options: {
    wordsConnector?: string;
    twoWordsConnector?: string;
    lastWordConnector?: string;
  } = {}
): string {
  const {
    wordsConnector = ", ",
    twoWordsConnector = " and ",
    lastWordConnector = ", and ",
  } = options;

  if (array.length === 0) return "";
  if (array.length === 1) return array[0];
  if (array.length === 2) return array[0] + twoWordsConnector + array[1];

  return (
    array.slice(0, -1).join(wordsConnector) +
    lastWordConnector +
    array[array.length - 1]
  );
}

/**
 * Return a new array with the given values appended.
 */
export function including<T>(array: T[], ...values: T[]): T[] {
  return [...array, ...values];
}

/**
 * Return a new array with the given values removed.
 */
export function excluding<T>(array: T[], ...values: T[]): T[] {
  return array.filter((item) => !values.includes(item));
}
