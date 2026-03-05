import { Binary, NodeOrValue } from "./binary.js";
import { NodeVisitor } from "./node.js";

/**
 * Represents a regex match: left ~ right.
 *
 * Mirrors: Arel::Nodes::Regexp
 */
export class Regexp extends Binary {
  constructor(left: NodeOrValue, right: NodeOrValue) {
    super(left, right);
  }

  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}

/**
 * Represents a negated regex match: left !~ right.
 *
 * Mirrors: Arel::Nodes::NotRegexp
 */
export class NotRegexp extends Binary {
  constructor(left: NodeOrValue, right: NodeOrValue) {
    super(left, right);
  }

  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}
