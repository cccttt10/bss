import Generator from '../Generator';
import Scope from '../Scope';
import Expression from './Expression';

export default class Color implements Expression {
    private hexString: string;
    public static readonly LONG_RGB_HEX_PATTERN =
        '#?([\\da-fA-F]{2})([\\da-fA-F]{2})([\\da-fA-F]{2})';
    public static readonly SHORT_RGB_HEX_PATTERN =
        '#?([\\da-fA-F])([\\da-fA-F])([\\da-fA-F])';

    constructor(hexString: string) {
        this.hexString = hexString;
    }

    public toString(): string {
        return this.hexString;
    }
    public isConstant(): boolean {
        return true;
    }

    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    public eval(scope: Scope, gen: Generator): Expression {
        return this;
    }
}
