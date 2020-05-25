import Generator from '../Generator';
import Scope from '../Scope';
import Expression from './Expression';

export default class ValueList implements Expression {
    private elements: Expression[] = [];
    private keepCommas = false;

    constructor(keepCommas: boolean) {
        this.keepCommas = keepCommas;
    }

    public toString(): string {
        let str = '';
        for (const expr of this.elements) {
            if (str.length > 0) {
                str = str + this.keepCommas ? ',' : ' ';
            }
            str = str + expr.toString();
        }
        return str;
    }

    public add(element: Expression): void {
        this.elements.push(element);
    }

    public getElements(): Expression[] {
        return this.elements;
    }

    public isConstant(): boolean {
        for (const expr of this.elements) {
            if (!expr.isConstant()) {
                return false;
            }
        }
        return true;
    }

    public eval(scope: Scope, gen: Generator): Expression {
        const result: ValueList = new ValueList(this.keepCommas);
        for (const expr of this.elements) {
            result.elements.push(expr.eval(scope, gen));
        }
        return result;
    }
}
