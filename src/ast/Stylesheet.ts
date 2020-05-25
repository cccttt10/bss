import Mixin from './Mixin';
import Section from './Section';
import Variable from './Variable';

export default class Stylesheet {
    private name: string;
    private variables: Variable[] = [];
    private mixins: Mixin[] = [];
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

    public addMixin(mixin: Mixin): void {
        this.mixins.push(mixin);
    }

    public getVariables(): Variable[] {
        return this.variables;
    }

    public getMixins(): Mixin[] {
        return this.mixins;
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
