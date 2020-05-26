/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import consola from 'consola';

import Attribute from './ast/Attribute';
import Expression from './ast/Expression';
import FunctionCall from './ast/FunctionCall';
import Mixin from './ast/Mixin';
import MixinReference from './ast/MixinReference';
import Section from './ast/Section';
import Stylesheet from './ast/Stylesheet';
import Value from './ast/Value';
import Variable from './ast/Variable';
import Output from './Output';
import Parser from './Parser';
import Scope from './Scope';
import ParseException from './tokenizer/ParseException';
import Reader from './tokenizer/Reader';

export default class Generator {
    protected importedSheets: Set<string> = new Set<string>();
    protected sections: Section[] = [];
    protected extensibleSections: Map<string, Section> = new Map<string, Section>();
    protected mediaQueries: Map<string, Section> = new Map<string, Section>();
    protected mixins: Map<string, Mixin> = new Map<string, Mixin>();
    protected scope: Scope = new Scope();
    // TODO: no baseDir

    protected resolve(sheet: string): Stylesheet {
        if (!sheet.endsWith('.bss')) {
            sheet = sheet + '.bss';
        }
        let reader: Reader = null;
        try {
            reader = new Reader(`./${sheet}`);
        } catch (err) {
            // TODO: throw?
            consola.error(`Cannot read file ./${sheet}`);
            throw err;
        }
        const parser: Parser = new Parser(sheet, reader);
        return parser.parse();
    }

    public importStylesheetByName(sheet: string): void {
        if (this.importedSheets.has(sheet)) {
            return;
        }
        this.importParsedStylesheet(this.resolve(sheet));
    }

    public importParsedStylesheet(sheet: Stylesheet): void {
        if (sheet === null) {
            return;
        }
        if (this.importedSheets.has(sheet.getName())) {
            return;
        }
        this.importedSheets.add(sheet.getName());
        for (const imp of sheet.getImports()) {
            this.importStylesheetByName(imp);
        }
        for (const mixin of sheet.getMixins()) {
            this.mixins.set(mixin.getName(), mixin);
        }
        for (const variable of sheet.getVariables()) {
            if (!this.scope.has(variable.getName()) || !variable.isDefaultValue()) {
                this.scope.set(variable.getName(), variable.getValue());
            } else {
                consola.warn(
                    "will skip redundant variable definition: '" +
                        variable.toString +
                        "'"
                );
            }
        }
        for (const section of sheet.getSections()) {
            const stack: Section[] = [];
            this.expand(null, section, stack);
        }
    }

    /*
    expand nested sections & media queries into a flat structure expected by CSS
    */
    private expand(
        mediaQueryPath: string,
        section: Section,
        stack: Section[]
    ): void {
        stack = [...stack]; // TODO: equivalent to stack = new ArrayList<>(stack) to Java?
        if (section.getSelectors().length > 0) {
            this.expandSection(mediaQueryPath, section, stack);
        } else {
            mediaQueryPath = this.expandMediaQuery(mediaQueryPath, section, stack);
        }

        if (
            section.getSelectorString() !== null &&
            !section.getSelectorString().startsWith('@')
        ) {
            // unfold subsections
            for (const child of section.getSubSections()) {
                this.expand(mediaQueryPath, child, stack);
            }

            // delete subsections
            // not necessary any more
            // also not supported by css
            // clear array
            while (section.getSubSections().length > 0) {
                section.getSubSections().pop();
            }
        }
    }

    private expandMediaQuery(
        mediaQueryPath: string,
        section: Section,
        stack: Section[]
    ): string {
        mediaQueryPath = this.expandMediaQueryPath(mediaQueryPath, section);

        // we have implicit attributes
        // in this case, we should copy the next parent that is not a media query
        // and generate a pseudo-section that covers these implicit attributes
        if (section.getAttributes().length > 0) {
            this.transfertImplicitAttributes(mediaQueryPath, section, stack);
        }
        return mediaQueryPath;
    }

    private transfertImplicitAttributes(
        mediaQueryPath: string,
        section: Section,
        stack: Section[]
    ): void {
        const copy: Section = new Section();
        if (stack.length > 0) {
            const parent: Section = stack[stack.length - 1];
            if (copy.getSelectors().length === 0) {
                for (const e of parent.getSelectors()) {
                    copy.getSelectors().push(e);
                }
            } else if (parent.getSelectors().length > 0) {
                for (let i = 0; i < copy.getSelectors().length; i++) {
                    copy.getSelectors()[i] = [
                        ...parent.getSelectors()[0],
                        ...copy.getSelectors()[i],
                    ];
                }
                // TODO: in java it should look like this
                // for (List<String> selector : copy.getSelectors()) {
                //     selector.addAll(0, parent.getSelectors().get(0));
                // }
            }
        }
        if (copy.getSelectors().length === 0) {
            consola.warn(
                `Cannot define attributes in @media selector '%${section.getMediaQuery(
                    this.scope,
                    this
                )}'`
            );
        } else {
            for (const e of section.getAttributes()) {
                copy.getAttributes().push(e);
            }
            this.addResultSection(mediaQueryPath, copy);
        }
    }

    private expandMediaQueryPath(mediaQueryPath: string, section: Section): string {
        // media query
        // update path
        if (mediaQueryPath === null) {
            mediaQueryPath = '@media ' + section.getMediaQuery(this.scope, this);
        } else {
            mediaQueryPath =
                mediaQueryPath + ' and ' + section.getMediaQuery(this.scope, this);
        }
        return mediaQueryPath;
    }

    private expandSection(
        mediaQueryPath: string,
        section: Section,
        stack: Section[]
    ): void {
        // there are selectors
        // it is a normal section
        // not a media query
        if (mediaQueryPath === null) {
            // add to output
            this.sections.push(section);
        } else {
            // we are already inside media query
            // add to proper result section
            this.addResultSection(mediaQueryPath, section);
        }
        // expand all selectors with those of the parents
        // i.e. flatten nesting
        const newSelectors: string[][] = [];
        for (const selector of section.getSelectors()) {
            if (stack.length === 0) {
                // no parent selector
                newSelectors.push(this.expandSelector(section, selector, null));
            } else {
                // create cross product of parent selector set
                // and current selector set
                for (const parentSelector of stack[
                    stack.length - 1
                ].getSelectors()) {
                    // clone selector
                    // so that each expansion starts with initial child selector
                    const clonedSelector: string[] = [...selector];
                    newSelectors.push(
                        this.expandSelector(section, clonedSelector, parentSelector)
                    );
                }
            }
        }

        // overwrite all selectors of this section
        // since size may have changed
        while (section.getSelectors().length > 0) {
            section.getSelectors().pop();
        }
        for (const newSelector of newSelectors) {
            section.getSelectors().push(newSelector);
        }

        // add to nesting stack (used by children)
        stack.push(section);
    }

    private expandSelector(
        section: Section,
        selector: string[],
        parentSelector: string[]
    ): string[] {
        if (parentSelector !== null) {
            if (
                selector.length > 1 &&
                parentSelector.length > 0 &&
                selector[0] === '&'
            ) {
                this.combineSelectors(selector, parentSelector);
            } else if (selector[selector.length - 1] === '&') {
                selector.pop();
                for (const e of parentSelector) {
                    selector.push(e);
                }
            } else {
                const newSelector: string[] = [...parentSelector, ...selector];
                for (const e of newSelector) {
                    selector.push(e);
                }
            }
        }

        // selectors with only 1 element
        // can be referenced by @extend
        if (selector.length === 1) {
            this.extensibleSections.set(selector[0], section);
        }

        return selector;
    }

    private combineSelectors(selector: string[], parentSelectors: string[]): void {
        const firstChild: string = selector[1];
        selector.shift();
        selector.shift();
        const selectorsToAdd = [...parentSelectors];
        const lastParent: string = selectorsToAdd[selectorsToAdd.length - 1];
        selectorsToAdd.pop();
        selector.unshift(lastParent + firstChild);
        selector.unshift(...selectorsToAdd);
    }

    private addResultSection(mediaQueryPath: string, section: Section): void {
        let qry: Section = this.mediaQueries.get(mediaQueryPath);
        if (qry === null || qry === undefined) {
            qry = new Section();
            // TODO: in java it should be qry.getSelectors().add(Collections.singletonList(mediaQueryPath));
            qry.getSelectors().push([mediaQueryPath]);
            this.mediaQueries.set(mediaQueryPath, qry);
        }
        qry.addSubSection(section);
    }

    public compile(): void {
        this.sections.unshift(...this.mediaQueries.values()); // TODO: hashmap values may be unordered
        const newSections = [...this.sections];
        for (const section of newSections) {
            this.compileSection(section);
        }
        const filteredSections = this.sections.filter(
            section =>
                !(
                    section.getSubSections().length === 0 &&
                    section.getAttributes().length === 0
                )
        );
        this.sections = filteredSections;
    }

    private compileSection(section: Section): void {
        for (const extend of section.getExtendedSections()) {
            const toBeExtended: Section = this.extensibleSections.get(extend);
            if (toBeExtended !== null && toBeExtended !== undefined) {
                toBeExtended.getSelectors().unshift(...section.getSelectors());
            } else {
                consola.warn(
                    `Skipping unknown @extend '%${extend}' referenced by selector '%${section.getSelectorString()}'`
                );
            }
        }

        this.compileMixins(section);

        for (const attr of section.getAttributes()) {
            attr.setExpression(attr.getExpression().eval(this.scope, this));
        }

        for (const subSection of section.getSubSections()) {
            this.compileSection(subSection);
        }
    }

    protected compileMixins(section: Section): void {
        for (const ref of section.getReferences()) {
            const subScope: Scope = new Scope(this.scope);
            const mixin: Mixin = this.mixins.get(ref.getName());
            if (mixin === null || mixin === undefined) {
                consola.warn(
                    `Skipping unknown @mixin '%${ref.getName()}' referenced by selector '%${section.getSelectorString()}'`
                );

                return;
            }
            this.compileMixin(section, ref, subScope, mixin);
        }
    }

    private compileMixin(
        section: Section,
        ref: MixinReference,
        subScope: Scope,
        mixin: Mixin
    ): void {
        if (mixin.getParameters().length !== ref.getParameters().length) {
            consola.warn(
                `@mixin call '${ref.getName()}' by selector '${section.getSelectorString()}' does not match expected number of parameters. Found: ${
                    ref.getParameters().length
                }, expected: ${mixin.getParameters().length}`
            );
        }

        this.evaluateParameters(ref, subScope, mixin);

        this.copyAndEvaluateAttributes(section, subScope, mixin);

        for (const child of mixin.getSubSections()) {
            this.processSubSection(section, subScope, child);
        }
    }

    private processSubSection(
        section: Section,
        subScope: Scope,
        child: Section
    ): void {
        const newCombination: Section = new Section();
        for (const outer of child.getSelectors()) {
            for (const inner of section.getSelectors()) {
                const fullSelector: string[] = [...outer];
                if (outer[outer.length - 1] === '&') {
                    fullSelector.pop();
                    fullSelector.push(...inner);
                } else if (outer[0] === '&') {
                    this.combineSelectors(fullSelector, inner);
                } else {
                    fullSelector.unshift(...inner);
                }
                newCombination.getSelectors().push(fullSelector);
            }
        }

        for (const attr of child.getAttributes()) {
            const copy: Attribute = new Attribute(attr.getName());
            copy.setExpression(attr.getExpression().eval(subScope, this));
            newCombination.addAttribute(copy);
        }
        this.sections.push(newCombination);
    }

    private copyAndEvaluateAttributes(
        section: Section,
        subScope: Scope,
        mixin: Mixin
    ): void {
        for (const attr of mixin.getAttributes()) {
            if (attr.getExpression().isConstant()) {
                section.addAttribute(attr);
            } else {
                const copy: Attribute = new Attribute(attr.getName());
                copy.setExpression(attr.getExpression().eval(subScope, this));
                section.addAttribute(copy);
            }
        }
    }

    private evaluateParameters(
        ref: MixinReference,
        subScope: Scope,
        mixin: Mixin
    ): void {
        let i = 0;
        for (const name of mixin.getParameters()) {
            if (ref.getParameters().length > i) {
                subScope.set(name, ref.getParameters()[i]);
            }
            i++;
        }
    }

    public toString(): string {
        let str = '';
        for (const section of this.sections) {
            str = str + section.toString();
            str = str + '\n';
        }
        return str;
    }

    public generate(out: Output): void {
        for (const section of this.sections) {
            section.generate(out);
            out.lineBreak();
            out.optionalLineBreak();
        }
    }

    public evaluateFunction(call: FunctionCall): Expression {
        return new Value(call.toString()); // TODO: ???
    }
}
