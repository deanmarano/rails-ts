/**
 * ModelName — naming conventions for a model class.
 *
 * Mirrors: ActiveModel::Name
 */
export class ModelName {
  readonly name: string;
  readonly singular: string;
  readonly plural: string;
  readonly element: string;
  readonly collection: string;
  readonly paramKey: string;
  readonly routeKey: string;
  readonly i18nKey: string;
  readonly namespace: string | null;

  private static _uncountables: Set<string> = new Set(["sheep", "fish", "series", "species", "money", "rice"]);

  static addUncountable(word: string): void {
    this._uncountables.add(word.toLowerCase());
  }

  constructor(className: string, options?: { namespace?: string }) {
    this.name = className;
    this.namespace = options?.namespace ?? null;

    // Handle namespace separator (e.g., "Blog::Post" -> "post")
    const baseName = className.includes("::")
      ? className.split("::").pop()!
      : className;

    const lower = this.underscore(baseName);
    this.singular = lower;
    this.plural = this.pluralize(lower);
    this.element = lower;
    this.collection = this.plural;
    this.paramKey = lower;
    this.routeKey = this.plural;
    this.i18nKey = lower;
  }

  private underscore(str: string): string {
    return str
      .replace(/::/g, "/")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
      .replace(/([a-z\d])([A-Z])/g, "$1_$2")
      .toLowerCase();
  }

  private pluralize(str: string): string {
    if (ModelName._uncountables.has(str)) return str;
    if (str.endsWith("s")) return str + "es";
    if (str.endsWith("y") && !/[aeiou]y$/.test(str)) {
      return str.slice(0, -1) + "ies";
    }
    return str + "s";
  }
}
