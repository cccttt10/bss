import Generator from '../Generator';
import Scope from '../Scope';
import { stdout } from '../util';
import Expression from './Expression';

export default class Num implements Expression {
    private numericValue: number | null;
    private value: string; // string representation of numericValue
    private unit: string;
    private static readonly NORMAL_NUMBER: string = '(\\d+)([a-z]+|%)';
    private static readonly DECIMAL_NUMBER: string =
        '(\\.\\d+|\\d+\\.\\d+)([a-z]+|%)';

    public isLetter(char: string): boolean {
        const lower: string = char.toLowerCase();
        return (
            lower === 'a' ||
            lower === 'b' ||
            lower === 'c' ||
            lower === 'd' ||
            lower === 'e' ||
            lower === 'f' ||
            lower === 'g' ||
            lower === 'h' ||
            lower === 'i' ||
            lower === 'j' ||
            lower === 'k' ||
            lower === 'l' ||
            lower === 'm' ||
            lower === 'n' ||
            lower === 'o' ||
            lower === 'p' ||
            lower === 'q' ||
            lower === 'r' ||
            lower === 's' ||
            lower === 't' ||
            lower === 'u' ||
            lower === 'v' ||
            lower === 'w' ||
            lower === 'x' ||
            lower === 'y' ||
            lower === 'z'
        );
    }

    private getFirstLetterIndex(str: string): number {
        for (let i = 0; i < str.length; i++) {
            if (this.isLetter(str.charAt(i))) {
                return i;
            }
        }
        return -1;
    }

    constructor(val: string) {
        stdout.info(`short num constructor ${val}`);
        this.numericValue = null;
        const matchesNormalNumber: boolean = new RegExp(Num.NORMAL_NUMBER).test(val);
        if (matchesNormalNumber) {
            const firstLetterIndex: number = this.getFirstLetterIndex(val);
            this.value = val.substring(0, firstLetterIndex);
            this.unit = val.substring(firstLetterIndex);
        } else {
            const matchesDecimalNumber = new RegExp(Num.DECIMAL_NUMBER).test(val);
            if (matchesDecimalNumber) {
                const firstLetterIndex: number = this.getFirstLetterIndex(val);
                this.value = val.substring(0, firstLetterIndex);
                this.unit = val.substring(firstLetterIndex);
            } else {
                this.value = val;
                this.unit = '';
            }
        }
    }

    public getValue(): string {
        return this.value;
    }

    public getUnit(): string {
        return this.unit;
    }

    public getNumericValue(): number {
        if (this.numericValue !== null) {
            return this.numericValue;
        }
        return parseFloat(this.value);
    }

    public toString(): string {
        return this.value + this.unit;
    }

    public isConstant(): boolean {
        return true;
    }

    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    public eval(scope: Scope, gen: Generator): Expression {
        return this;
    }
}
