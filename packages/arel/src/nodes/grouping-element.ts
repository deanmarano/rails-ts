import { Node, NodeVisitor } from "./node.js";

/**
 * Base class for advanced grouping elements.
 */
abstract class GroupingElement extends Node {
  readonly expressions: Node[];

  constructor(expressions: Node[]) {
    super();
    this.expressions = expressions;
  }
}

/**
 * CUBE(...) grouping element for GROUP BY.
 *
 * Mirrors: Arel::Nodes::Cube
 */
export class Cube extends GroupingElement {
  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}

/**
 * ROLLUP(...) grouping element for GROUP BY.
 *
 * Mirrors: Arel::Nodes::RollUp
 */
export class Rollup extends GroupingElement {
  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}

/**
 * GROUPING SETS(...) grouping element for GROUP BY.
 *
 * Mirrors: Arel::Nodes::GroupingSet
 */
export class GroupingSet extends GroupingElement {
  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}
