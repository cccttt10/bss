import Attribute from './Attribute';
import Section from './Section';

export default class Mixin {
    private parameters: string[] = [];
    private attributes: Attribute[] = [];
    private subSections: Section[] = [];
    private name: string;

    public addParameter(name: string): void {
        this.parameters.push(name);
    }

    public addAttribute(attr: Attribute): void {
        this.attributes.push(attr);
    }

    public setName(name: string): void {
        this.name = name;
    }

    public addSubSection(section: Section): void {
        this.subSections.push(section);
    }

    public getName(): string {
        return this.name;
    }

    public getParameters(): string[] {
        return this.parameters;
    }

    public getAttributes(): Attribute[] {
        return this.attributes;
    }

    public getSubSections(): Section[] {
        return this.subSections;
    }
}
