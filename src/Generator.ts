/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import Attribute from './ast/Attribute';
import Expression from './ast/Expression';
import FunctionCall from './ast/FunctionCall';
import Mixin from './ast/Mixin';
import MixinReference from './ast/MixinReference';
import Section from './ast/Section';
import Stylesheet from './ast/Stylesheet';
import Value from './ast/Value';
import Variable from './ast/Variable';
import Scope from './Scope';
import ParseException from './tokenizer/ParseException';

export default class Generator {
    protected importedSheets: Set<string> = new Set<string>();
    protected sections: Section[] = [];
    protected extensibleSections: Map<string, Section> = new Map<string, Section>();
    protected mediaQueries: Map<string, Section> = new Map<string, Section>();
    protected mixins: Map<string, Mixin> = new Map<string, Mixin>();
    protected scope: Scope = new Scope();
}
