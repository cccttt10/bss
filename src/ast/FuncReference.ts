import Expression from './Expression';
import FunctionCall from './FunctionCall';

export default class FuncReference {
    private name: string;
    private parameters: Expression[] = [];

    public getName(): string {
        return this.name;
    }

    public toString(): string {
        let str = '@call ';
        str =
            str +
            FunctionCall.appendNameAndParameters(str, this.name, this.parameters);
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
}
