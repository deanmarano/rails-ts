import { Node, NodeVisitor } from "./node.js";

/**
 * LATERAL subquery wrapper.
 *
 * Mirrors: Arel::Nodes::Lateral
 */
export class Lateral extends Node {
  readonly subquery: Node;

  constructor(subquery: Node) {
    super();
    this.subquery = subquery;
  }

  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}
