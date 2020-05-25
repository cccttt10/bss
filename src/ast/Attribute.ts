import Expression from './Expression';

export default class Attribute {
    private name: string;
    private expression: Expression;

    constructor(name: string) {
        this.name = name;
    }

    public setExpression(expression: Expression): void {
        this.expression = expression;
    }

    public getExpression(): Expression {
        return this.expression;
    }

    public toString(): string {
        return this.name + ': ' + this.expression.toString() + ';';
    }

    public getName(): string {
        return this.name;
    }
}
