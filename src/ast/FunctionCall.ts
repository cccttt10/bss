import Generator from '../Generator';
import Scope from '../Scope';
import Color from './Color';
import Expression from './Expression';

export default class FunctionCall implements Expression {
    private name: string;
    private parameters: Expression[] = [];

    public getName(): string {
        return this.name;
    }

    public toString(): string {
        let str = '';
        str =
            str +
            FunctionCall.appendNameAndParameters(str, this.name, this.parameters);
        return str;
    }

    public static appendNameAndParameters(
        str: string,
        name: string,
        parameters: Expression[]
    ): string {
        str = str + name;
        str = str + '(';
        let first = true;
        for (const expr of parameters) {
            if (!first) {
                str = str + ', ';
            }
            first = false;
            str = str + expr.toString();
        }
        str = str + ')';
        return str;
    }

    public setName(name: string): void {
        this.name = name;
    }

    public addParameter(expression: Expression): void {
        this.parameters.push(expression);
    }

    public getParameters(): Expression[] {
        return this.parameters;
    }

    /*
    returns parameter at expected index.
    @param index: index of parameter to access
    @return: expression representing at given index
    @throws error if index is out of bounds
    */
    public getExpectedParam(index: number): Expression {
        if (this.parameters.length <= index) {
            throw new Error(
                'Parameter index out of bounds: ' +
                    index +
                    '. Function call: ' +
                    this.toString()
            );
        }
        return this.parameters[index];
    }

    public getExpectedColorParam(index: number): Color {
        const expr: Expression = this.getExpectedParam(index);
        if (!(expr instanceof Color)) {
            throw new Error(
                'Parameter ' +
                    index +
                    " isn't a color. Function call: " +
                    this.toString()
            );
        }
        return expr as Color;
    }

    public getExpectedIntParam(index: number): number {
        return parseInt(this.getExpectedParam(index).toString().replace('%', ''));
    }

    public getExpectedFloatParam(index: number): number {
        return parseFloat(this.getExpectedParam(index).toString());
    }

    public isConstant(): boolean {
        return true;
    }

    public eval(scope: Scope, gen: Generator): Expression {
        // since calc is a CSS function
        // we do not evaluate inner arguments in our compiler
        // this is left to the browser
        if (this.name === 'calc') {
            return this;
        }
        const call: FunctionCall = new FunctionCall();
        call.setName(this.name);
        for (const expr of this.parameters) {
            call.addParameter(expr.eval(scope, gen));
        }
        return gen.evaluateFunction(call);
    }
}
