import { Node, NodeVisitor } from "./node.js";

/**
 * Unary — base class for nodes with a single expression.
 *
 * Mirrors: Arel::Nodes::Unary
 */
export class Unary extends Node {
  readonly expr: Node | string | number | null;

  constructor(expr: Node | string | number | null) {
    super();
    this.expr = expr;
  }

  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}

export class Offset extends Unary {}
export class Limit extends Unary {}
export class Top extends Unary {}
export class Lock extends Unary {}
export class DistinctOn extends Unary {}
export class Bin extends Unary {}
export class On extends Unary {}

/**
 * Ascending — ORDER BY ... ASC
 *
 * Mirrors: Arel::Nodes::Ascending
 */
export class Ascending extends Unary {
  get direction(): "asc" {
    return "asc";
  }

  isAscending(): boolean {
    return true;
  }

  isDescending(): boolean {
    return false;
  }

  reverse(): Descending {
    return new Descending(this.expr);
  }

  nullsFirst(): NullsFirst {
    return new NullsFirst(this);
  }

  nullsLast(): NullsLast {
    return new NullsLast(this);
  }
}

/**
 * Descending — ORDER BY ... DESC
 *
 * Mirrors: Arel::Nodes::Descending
 */
export class Descending extends Unary {
  get direction(): "desc" {
    return "desc";
  }

  isAscending(): boolean {
    return false;
  }

  isDescending(): boolean {
    return true;
  }

  reverse(): Ascending {
    return new Ascending(this.expr);
  }

  nullsFirst(): NullsFirst {
    return new NullsFirst(this);
  }

  nullsLast(): NullsLast {
    return new NullsLast(this);
  }
}

/**
 * NullsFirst — ORDER BY ... NULLS FIRST
 *
 * Mirrors: Arel::Nodes::NullsFirst
 */
export class NullsFirst extends Unary {
  reverse(): NullsLast {
    const inner = this.expr as Ascending | Descending;
    return new NullsLast(inner.reverse());
  }
}

/**
 * NullsLast — ORDER BY ... NULLS LAST
 *
 * Mirrors: Arel::Nodes::NullsLast
 */
export class NullsLast extends Unary {
  reverse(): NullsFirst {
    const inner = this.expr as Ascending | Descending;
    return new NullsFirst(inner.reverse());
  }
}
