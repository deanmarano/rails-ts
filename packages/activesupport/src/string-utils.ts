/**
 * String utilities mirroring Rails ActiveSupport string extensions.
 */

export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return /^\s*$/.test(value);
  if (typeof value === "boolean") return !value;
  if (typeof value === "number") return false;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

export function isPresent(value: unknown): boolean {
  return !isBlank(value);
}

export function presence<T>(value: T): T | undefined {
  return isPresent(value) ? value : undefined;
}

export function squish(str: string): string {
  return str.trim().replace(/\s+/g, " ");
}

export function truncate(
  str: string,
  length: number,
  options: { omission?: string } = {}
): string {
  const { omission = "..." } = options;
  if (str.length <= length) return str;
  return str.slice(0, length - omission.length) + omission;
}

export function truncateWords(
  str: string,
  count: number,
  options: { omission?: string } = {}
): string {
  const { omission = "..." } = options;
  const words = str.split(/\s+/);
  if (words.length <= count) return str;
  return words.slice(0, count).join(" ") + omission;
}
