import Generator from '../Generator';
import Scope from '../Scope';
import Expression from './Expression';

export default class NamedParameter implements Expression {
    private name: string;
    private value: Expression;

    constructor(name: string, value: Expression) {
        this.name = name;
        this.value = value;
    }

    public toString(): string {
        if (this.name !== null) {
            return this.name + ' = ' + this.value.toString();
        } else {
            return this.value.toString();
        }
    }

    public isConstant(): boolean {
        return this.value.isConstant();
    }

    public eval(scope: Scope, gen: Generator): Expression {
        if (this.isConstant()) {
            return this;
        }
        return new NamedParameter(this.name, this.value.eval(scope, gen));
    }
}
