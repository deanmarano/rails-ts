import { Node, NodeVisitor } from "./node.js";
import { As } from "./binary.js";
import { SqlLiteral } from "./sql-literal.js";

/**
 * Represents EXTRACT(field FROM expr).
 *
 * Mirrors: Arel::Nodes::Extract
 */
export class Extract extends Node {
  readonly expr: Node;
  readonly field: string;

  constructor(expr: Node, field: string) {
    super();
    this.expr = expr;
    this.field = field;
  }

  as(aliasName: string): As {
    return new As(this, new SqlLiteral(aliasName));
  }

  accept<T>(visitor: NodeVisitor<T>): T {
    return visitor.visit(this);
  }
}
