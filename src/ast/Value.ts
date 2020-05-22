import Generator from '../Generator';
import Scope from '../Scope';
import Expression from './Expression';

export default class Value implements Expression {
    private contents: string;

    constructor(contents?: string) {
        if (contents !== null && contents !== undefined) {
            this.contents = contents;
        }
    }

    public getContents(): string {
        return this.contents;
    }

    public toString(): string {
        return this.contents;
    }

    public isConstant(): boolean {
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    public eval(scope: Scope, gen: Generator): Expression {
        return this;
    }
}
