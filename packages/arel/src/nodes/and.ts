import { Node, NodeVisitor } from "./node.js";
import { As } from "./binary.js";
import { SqlLiteral } from "./sql-literal.js";

/**
 * AND node — represents a conjunction of children.
 *
 * Mirrors: Arel::Nodes::And
 */
export class And extends Node {
  readonly children: Node[];

  constructor(children: Node[]) {
    super();
    this.children = children;
  }

  as(aliasName: string): As {
    return new As(this, new SqlLiteral(aliasName));
  }

  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}
