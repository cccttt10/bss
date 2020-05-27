import Func from './Func';
import Section from './Section';
import Variable from './Variable';

export default class Stylesheet {
    private name: string;
    private variables: Variable[] = [];
    private funcs: Func[] = [];
    private sections: Section[] = [];
    private imports: string[] = [];

    constructor(name: string) {
        this.name = name;
    }

    public addImport(name: string): void {
        this.imports.push(name);
    }

    public addVariable(variable: Variable): void {
        this.variables.push(variable);
    }

    public addSection(section: Section): void {
        this.sections.push(section);
    }

    public addFunc(func: Func): void {
        this.funcs.push(func);
    }

    public getVariables(): Variable[] {
        return this.variables;
    }

    public getFuncs(): Func[] {
        return this.funcs;
    }

    public getSections(): Section[] {
        return this.sections;
    }

    public getImports(): string[] {
        return this.imports;
    }

    public getName(): string {
        return this.name;
    }

    public toString(): string {
        let str = '';
        for (const variable of this.variables) {
            str = str + variable.toString();
            str = str + ';\n';
        }
        for (const section of this.sections) {
            str = str + '\n';
            str = str + section.toString();
        }
        return str;
    }
}
