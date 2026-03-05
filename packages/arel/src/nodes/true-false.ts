import { Node, NodeVisitor } from "./node.js";

/**
 * Represents SQL TRUE literal.
 *
 * Mirrors: Arel::Nodes::True
 */
export class True extends Node {
  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}

/**
 * Represents SQL FALSE literal.
 *
 * Mirrors: Arel::Nodes::False
 */
export class False extends Node {
  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}
