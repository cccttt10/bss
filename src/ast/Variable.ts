import Expression from './Expression';
export default class Variable {
    private value: Expression;
    private defaultValue = false;
    private name: string;

    public setName(name: string): void {
        this.name = name;
    }

    public getName(): string {
        return this.name;
    }

    public getValue(): Expression {
        return this.value;
    }

    public setValue(value: Expression): void {
        this.value = value;
    }

    public isDefaultValue(): boolean {
        return this.defaultValue;
    }

    public setDefaultValue(defaultValue: boolean): void {
        this.defaultValue = defaultValue;
    }

    public toString(): string {
        return (
            this.name + ': ' + this.value + (this.defaultValue ? ' !default' : '')
        );
    }
}
