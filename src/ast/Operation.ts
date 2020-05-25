import consola from 'consola';

import Generator from '../Generator';
import Scope from '../Scope';
import Expression from './Expression';
import Num from './Num';
import Value from './Value';

export default class Operation implements Expression {
    private op: string;
    private left: Expression;
    private right: Expression;
    private protected = false;

    constructor(operation: string, left: Expression, right: Expression) {
        this.op = operation;
        this.left = left;
        this.right = right;
    }

    public protect(): void {
        this.protected = true;
    }

    public getOperation(): string {
        return this.op;
    }

    public isProtected(): boolean {
        return this.protected;
    }

    public getLeft(): Expression {
        return this.left;
    }

    public getRight(): Expression {
        return this.right;
    }

    public setRight(right: Expression): void {
        this.right = right;
    }

    public toString(): string {
        return (
            (this.protected ? '(' : '') +
            this.left +
            ' ' +
            this.op +
            ' ' +
            this.right +
            (this.protected ? ')' : '')
        );
    }

    public isConstant(): boolean {
        return this.left.isConstant() && this.right.isConstant();
    }

    public eval(scope: Scope, gen: Generator): Expression {
        const newLeft: Expression = this.left.eval(scope, gen);
        const newRight: Expression = this.right.eval(scope, gen);
        if (newLeft instanceof Num && newRight instanceof Num) {
            return this.evalNumbers(gen, newLeft as Num, newRight as Num);
        } else {
            return new Value(newLeft.toString() + newRight.toString());
        }
    }

    protected evalNumbers(gen: Generator, l: Num, r: Num): Expression {
        let lVal: number = l.getNumericValue();
        let lUnit: string = l.getUnit();
        if (lUnit === '%') {
            lVal = lVal / 100; // TODO: 100d in decimal?
            lUnit = '';
        }
        let rVal: number = r.getNumericValue();
        let rUnit: string = r.getUnit();
        if (rUnit === '%') {
            rVal = rVal / 100; // TODO: 100d in decimal?
            rUnit = '';
        }

        let value: number = this.evalOperation(gen, lVal, rVal);
        let unit = '';
        if (this.op !== '/') {
            if (this.isPercentResult(l, r)) {
                value = value * 100;
                unit = '%';
            } else {
                unit = this.determineResultUnit(gen, lUnit, rUnit);
            }
        }
        const rounded: number = Math.round(value);
        if (Math.abs(value - rounded) > 0.009) {
            return new Num('long', {
                numericValue: value,
                value: value.toString(),
                unit: unit,
            });
            // TODO: value not formatted as String.format(Locale.ENGLISH, "%1.2f"
        }

        return new Num('long', {
            numericValue: value,
            value: Math.round(value).toString(),
            unit: unit,
        });
    }

    private isPercentResult(l: Num, r: Num): boolean {
        if (l.getUnit() === '%' && r.getUnit() === '%') {
            return true;
        }
        if (l.getUnit() === '%' || r.getUnit() === '%') {
            if (l.getUnit() !== null && l.getUnit().length === 0) {
                return true;
            }
            if (r.getUnit() !== null && r.getUnit().length === 0) {
                return true;
            }
        }
        return false;
    }

    private determineResultUnit(
        gen: Generator,
        lUnit: string,
        rUnit: string
    ): string {
        if (lUnit !== null && lUnit.length === 0) {
            return rUnit;
        }
        if (rUnit !== null && rUnit.length > 0 && rUnit !== lUnit) {
            consola.warn(
                `Incompatible units mixed in expression '%${this}': will use left unit as result`
            );
        }
        return lUnit;
    }

    protected evalOperation(gen: Generator, lVal: number, rVal: number): number {
        let value = 0;
        if (this.op === '/') {
            if (rVal !== 0) {
                value = lVal / rVal;
            } else {
                consola.warn(
                    `Cannot evaluate: '%${this}': division by 0: will default to 0 as result`
                );
            }
        } else if (this.op === '*') {
            value = lVal * rVal;
        } else if (this.op === '%') {
            value = lVal % rVal;
        } else if (this.op === '+') {
            value = lVal + rVal;
        } else if (this.op === '-') {
            value = lVal - rVal;
        }
        return value;
    }
}
