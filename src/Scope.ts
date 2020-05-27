import Expression from './ast/Expression';
import Value from './ast/Value';

export default class Scope {
    private parent: Scope;
    private variables: Map<string, Expression> = new Map<string, Expression>();

    constructor(scope?: Scope) {
        if (scope !== null && scope !== undefined) {
            this.parent = scope;
        }
    }

    public set(name: string, value: Expression): void {
        this.variables.set(name, value);
    }

    public get(name: string): Expression {
        if (this.variables.has(name)) {
            return this.variables.get(name);
        }
        if (this.parent === null) {
            return new Value('');
        }
        return this.parent.get(name);
    }

    public has(name: string): boolean {
        return this.variables.has(name);
    }
}
