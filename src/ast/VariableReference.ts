import Generator from '../Generator';
import Scope from '../Scope';
import Expression from './Expression';

export default class VariableReference implements Expression {
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    public getName(): string {
        return this.name;
    }

    public toString(): string {
        return '$' + this.name;
    }

    public isConstant(): boolean {
        return false;
    }

    public eval(scope: Scope, gen: Generator): Expression {
        return scope.get(this.name).eval(scope, gen);
    }
}
