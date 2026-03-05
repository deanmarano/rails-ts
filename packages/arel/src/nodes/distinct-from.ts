import { Binary, NodeOrValue } from "./binary.js";
import { NodeVisitor } from "./node.js";

/**
 * Represents IS DISTINCT FROM comparison.
 *
 * Mirrors: Arel::Nodes::IsDistinctFrom
 */
export class IsDistinctFrom extends Binary {
  constructor(left: NodeOrValue, right: NodeOrValue) {
    super(left, right);
  }

  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}

/**
 * Represents IS NOT DISTINCT FROM comparison.
 *
 * Mirrors: Arel::Nodes::IsNotDistinctFrom
 */
export class IsNotDistinctFrom extends Binary {
  constructor(left: NodeOrValue, right: NodeOrValue) {
    super(left, right);
  }

  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}
