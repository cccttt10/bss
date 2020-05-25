import Generator from '../Generator';
import Scope from '../Scope';
import Expression from './Expression';

export default class MediaFilter implements Expression {
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
        return '(' + this.name + ': ' + this.expression.toString() + ')';
    }

    public getName(): string {
        return this.name;
    }

    public isConstant(): boolean {
        return this.expression.isConstant();
    }

    public eval(scope: Scope, gen: Generator): Expression {
        const result: MediaFilter = new MediaFilter(this.name);
        result.setExpression(this.expression.eval(scope, gen));
        return result;
    }
}
