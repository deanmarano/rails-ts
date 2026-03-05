import { Node, NodeVisitor } from "./node.js";
import { As } from "./binary.js";
import { SqlLiteral } from "./sql-literal.js";

/**
 * Represents a custom infix operation: left OP right.
 *
 * Mirrors: Arel::Nodes::InfixOperation
 */
export class InfixOperation extends Node {
  readonly operator: string;
  readonly left: Node;
  readonly right: Node;

  constructor(operator: string, left: Node, right: Node) {
    super();
    this.operator = operator;
    this.left = left;
    this.right = right;
  }

  as(aliasName: string): As {
    return new As(this, new SqlLiteral(aliasName));
  }

  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}
