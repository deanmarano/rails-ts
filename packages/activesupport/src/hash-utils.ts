/**
 * Hash/object utilities mirroring Rails ActiveSupport hash extensions.
 */

type AnyObject = Record<string, unknown>;

/**
 * Deep merge two objects recursively. When both values are objects, they are
 * merged recursively. Otherwise the source value wins.
 */
export function deepMerge<T extends AnyObject>(target: T, source: AnyObject): T {
  const result = { ...target } as AnyObject;
  for (const key of Object.keys(source)) {
    const targetVal = result[key];
    const sourceVal = source[key];
    if (
      isPlainObject(targetVal) &&
      isPlainObject(sourceVal)
    ) {
      result[key] = deepMerge(targetVal as AnyObject, sourceVal as AnyObject);
    } else {
      result[key] = sourceVal;
    }
  }
  return result as T;
}

/**
 * Deep clone an object.
 */
export function deepDup<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => deepDup(item)) as T;
  if (typeof obj === "object" && isPlainObject(obj)) {
    const result: AnyObject = {};
    for (const key of Object.keys(obj as AnyObject)) {
      result[key] = deepDup((obj as AnyObject)[key]);
    }
    return result as T;
  }
  return obj;
}

/**
 * Pick only the specified keys from an object.
 */
export function slice<T extends AnyObject, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Return a copy of the object without the specified keys.
 */
export function except<T extends AnyObject, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Recursively transform all keys using the provided function.
 */
export function deepTransformKeys(
  obj: unknown,
  fn: (key: string) => string
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => deepTransformKeys(item, fn));
  }
  if (obj !== null && typeof obj === "object" && isPlainObject(obj)) {
    const result: AnyObject = {};
    for (const key of Object.keys(obj as AnyObject)) {
      result[fn(key)] = deepTransformKeys((obj as AnyObject)[key], fn);
    }
    return result;
  }
  return obj;
}

/**
 * Recursively convert all keys to camelCase (Rails' symbolize_keys equivalent).
 */
export function deepCamelizeKeys(obj: unknown): unknown {
  return deepTransformKeys(obj, (key) =>
    key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  );
}

/**
 * Recursively convert all keys to snake_case (Rails' stringify_keys equivalent).
 */
export function deepUnderscoreKeys(obj: unknown): unknown {
  return deepTransformKeys(obj, (key) =>
    key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "")
  );
}

/**
 * Pop an options hash from the end of an arguments array (Rails convention).
 * If the last element is a plain object, it is removed and returned.
 * Otherwise returns an empty object.
 */
export function extractOptions<T>(args: T[]): [T[], AnyObject] {
  if (
    args.length > 0 &&
    isPlainObject(args[args.length - 1])
  ) {
    const options = args[args.length - 1] as unknown as AnyObject;
    return [args.slice(0, -1), options];
  }
  return [args, {}];
}

function isPlainObject(value: unknown): value is AnyObject {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
