import Generator from '../Generator';
import Output from '../Output';
import Scope from '../Scope';
import Attribute from './Attribute';
import Expression from './Expression';
import FuncReference from './FuncReference';
/*
represents a section containing a list of selectors and a group of attributes
this is used for both,
a) parsed SASS section (with nested sections)
and
b) flattened CSS sections and media queries
*/

export default class Section {
    private selectors: string[][] = [];
    private mediaQueries: Expression[] = [];
    private extendedSections: string[] = [];
    private attributes: Attribute[] = [];
    private subSections: Section[] = [];
    private references: FuncReference[] = [];

    public getSelectors(): string[][] {
        return this.selectors;
    }

    public addAttribute(attr: Attribute): void {
        this.attributes.push(attr);
    }

    public addMediaQuery(query: Expression): void {
        this.mediaQueries.push(query);
    }

    public addSubSection(section: Section): void {
        this.subSections.push(section);
    }

    public addExtends(name: string): void {
        this.extendedSections.push(name);
    }

    public addFuncReference(ref: FuncReference): void {
        this.references.push(ref);
    }

    public getExtendedSections(): string[] {
        return this.extendedSections;
    }

    public getAttributes(): Attribute[] {
        return this.attributes;
    }

    public getSubSections(): Section[] {
        return this.subSections;
    }

    public getReferences(): FuncReference[] {
        return this.references;
    }

    public getMediaQuery(scope: Scope, gen: Generator): string {
        let str = '';
        for (const expr of this.mediaQueries) {
            if (str.length > 0) {
                str = str + ' and ';
            }
            str = str + expr.eval(scope, gen);
        }
        return str;
    }

    public getSelectorString(): string {
        let str = '';
        for (const selector of this.selectors) {
            if (str.length > 0) {
                str = str + ',';
            }
            for (const s of selector) {
                if (str.length > 0) {
                    str = str + ' ';
                }
                str = str + s;
            }
        }
        return str;
    }

    public toString(): string {
        let str = this.getSelectorString();
        str = str + ' {\n';
        for (const attr of this.attributes) {
            str = str + ' ';
            str = str + attr.toString();
            str = str + '\n';
        }
        for (const child of this.subSections) {
            str = str + child.toString();
            str = str + '\n';
        }
        str = str + '}';
        return str;
    }

    public generate(out: Output): void {
        out.output(this.getSelectorString());
        out.output(' {');
        out.incIndent();
        for (const attr of this.attributes) {
            out.optionalLineBreak();
            out.output(attr.toString());
        }
        for (const child of this.subSections) {
            out.lineBreak();
            child.generate(out);
        }
        out.decIndent();
        out.optionalLineBreak();
        out.output('}');
    }
}
