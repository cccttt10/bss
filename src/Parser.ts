import Attribute from './ast/Attribute';
import Color from './ast/Color';
import Expression from './ast/Expression';
import Func from './ast/Func';
import FuncReference from './ast/FuncReference';
import FunctionCall from './ast/FunctionCall';
import MediaFilter from './ast/MediaFilter';
import NamedParameter from './ast/NamedParameter';
import Num from './ast/Num';
import Operation from './ast/Operation';
import Section from './ast/Section';
import Stylesheet from './ast/Stylesheet';
import Value from './ast/Value';
import ValueList from './ast/ValueList';
import Variable from './ast/Variable';
import VariableReference from './ast/VariableReference';
import BssTokenizer from './BssTokenizer';
import ParseException from './tokenizer/ParseException';
import Reader from './tokenizer/Reader';
import Token from './tokenizer/Token';
import TokenType from './tokenizer/TokenType';
import { throwParseException } from './util';

export default class Parser {
    public static readonly KEYWORD_IMPORT = 'import';
    public static readonly KEYWORD_FUNC = 'func';
    public static readonly KEYWORD_CALL = 'call';
    public static readonly KEYWORD_EXTEND = 'extend';
    public static readonly KEYWORD_MEDIA = 'media';
    private readonly tokenizer: BssTokenizer;
    private result: Stylesheet;

    constructor(name: string, input: Reader) {
        this.tokenizer = new BssTokenizer(input);
        this.result = new Stylesheet(name);
    }

    /*
    parse given input
    return parsed stylesheet (i.e. AST representation of parsed input)
    */
    public parse(): Stylesheet {
        while (this.tokenizer.more()) {
            if (this.tokenizer.current().isKeyword(Parser.KEYWORD_IMPORT)) {
                // parse @import
                this.parseImport();
            } else if (this.tokenizer.current().isKeyword(Parser.KEYWORD_FUNC)) {
                // parse @func
                const func: Func = this.parseFunc();
                if (func.getName() !== null) {
                    this.result.addFunc(func);
                }
            } else if (this.tokenizer.current().isKeyword(Parser.KEYWORD_MEDIA)) {
                // parse @media
                this.result.addSection(this.parseSection(true));
            } else if (
                this.tokenizer.current().isSpecialIdentifier('$') &&
                this.tokenizer.next().isSymbol(':')
            ) {
                // parse variable definition
                this.parseVariableDeclaration();
            } else {
                // everything else is considered a "normal" section
                // with selectors and attributes
                this.result.addSection(this.parseSection(false));
            }
        }

        // throw error if something went wrong
        if (this.tokenizer.getProblemCollector().length > 0) {
            const parseException: ParseException = ParseException.create(
                this.tokenizer.getProblemCollector()
            );
            throwParseException(parseException);
        }

        return this.result;
    }

    /*
    parses a "section" which is either a media query or a css selector
    with a set of attributes.
    @param isMediaQuery determines if we will parse a media query or a "normal" section
    */
    private parseSection(isMediaQuery: boolean): Section {
        const section: Section = new Section();
        this.parseSectionSelector(isMediaQuery, section);
        this.tokenizer.consumeExpectedSymbol('{');
        while (this.tokenizer.more()) {
            if (this.tokenizer.current().isSymbol('}')) {
                this.tokenizer.consumeExpectedSymbol('}');
                return section;
            }
            // parse "normal" attributes
            // e.g. "font-weight: bold;"
            if (this.isAtAttribute()) {
                const attr: Attribute = this.parseAttribute();
                section.addAttribute(attr);
            } else if (this.tokenizer.current().isKeyword(Parser.KEYWORD_MEDIA)) {
                // parse @media subsections
                section.addSubSection(this.parseSection(true));
            } else if (this.tokenizer.current().isKeyword(Parser.KEYWORD_CALL)) {
                this.parseCall(section);
            } else if (this.tokenizer.current().isKeyword(Parser.KEYWORD_EXTEND)) {
                this.parseExtend(section);
            } else {
                // if it is neither an attribute
                // nor a media query or instruction
                // it is probably a sub section...
                section.addSubSection(this.parseSection(false));
            }
        }
        this.tokenizer.consumeExpectedSymbol('}');
        return section;
    }

    private isAtAttribute(): boolean {
        // an attribute has at least to start with x: y ...
        if (
            !this.tokenizer.current().isIdentifier() ||
            !this.tokenizer.next().isSymbol(':')
        ) {
            return false;
        }

        // we need to search for the final ";"
        // to determine if we're really looking at an attribute
        let i = 2;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const next: Token = this.tokenizer.next(i);
            if (next.isEnd() || next.isSymbol(';')) {
                return true;
            } else if (next.isSymbol('{')) {
                return false;
            } else {
                i++;
            }
        }
    }

    private parseExtend(result: Section): void {
        // parse @extend instructions
        // e.g. "@extend .warning"
        this.tokenizer.consumeExpectedKeyword(Parser.KEYWORD_EXTEND);
        if (
            this.tokenizer.current().isIdentifier() ||
            this.tokenizer.current().isSpecialIdentifier('#')
        ) {
            result.addExtends(this.tokenizer.consumeNoArg().getSource());
        } else {
            this.tokenizer.addError(
                this.tokenizer.current(),
                "Unexpected token: '" +
                    this.tokenizer.current().getSource() +
                    "'. Expected a selector to call."
            );
        }
        if (
            this.tokenizer.current().isSymbol(';') ||
            !this.tokenizer.next().isSymbol('}')
        ) {
            this.tokenizer.consumeExpectedSymbol(';');
        }
    }

    private parseCall(result: Section): void {
        // Take care of call funcs like "@call border(15px);"
        this.tokenizer.consumeExpectedKeyword(Parser.KEYWORD_CALL);
        const ref: FuncReference = new FuncReference();
        if (this.tokenizer.current().isIdentifier()) {
            ref.setName(this.tokenizer.consumeNoArg().getContents());
        } else {
            this.tokenizer.addError(
                this.tokenizer.current(),
                "Unexpected token: '" +
                    this.tokenizer.current().getSource() +
                    "'. Expected a func to use"
            );
        }
        if (this.tokenizer.current().isSymbol('(')) {
            this.tokenizer.consumeExpectedSymbol('(');
            // Parse parameters - be as error tolerant as possible
            while (
                this.tokenizer.more() &&
                !this.tokenizer.current().isSymbol(')', ';', '{', '}')
            ) {
                ref.addParameter(this.parseExpression(false));
                this.consumeExpectedComma();
            }
            this.tokenizer.consumeExpectedSymbol(')');
        }
        if (
            this.tokenizer.current().isSymbol(';') ||
            !this.tokenizer.next().isSymbol('}')
        ) {
            this.tokenizer.consumeExpectedSymbol(';');
        }
        if (ref.getName() !== null) {
            result.addFuncReference(ref);
        }
    }

    private parseSectionSelector(isMediaQuery: boolean, result: Section): void {
        if (isMediaQuery) {
            this.parseMediaQuerySelector(result);
        } else {
            // parse selectors
            // e.g. "b div.test"
            while (this.tokenizer.more()) {
                const selector: string[] = this.parseSelector();
                result.getSelectors().push(selector);
                // if another selector is given
                // swallow the "," and parse the next selector
                // else we're done.
                if (!this.tokenizer.current().isSymbol(',')) {
                    break;
                } else {
                    this.tokenizer.consumeExpectedSymbol(',');
                }
            }
        }
    }

    private parseMediaQuerySelector(result: Section): void {
        // parse media queries like
        // @media screen and (min-width: 1200px)
        this.tokenizer.consumeExpectedKeyword(Parser.KEYWORD_MEDIA);
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (this.tokenizer.current().isIdentifier()) {
                // handle plain identifiers
                // e.g. "screen" or "print"
                result.addMediaQuery(
                    new Value(this.tokenizer.consumeNoArg().getContents())
                );
            } else if (this.tokenizer.current().isSymbol('(')) {
                this.parseMediaQueryFilters(result);
            } else {
                return;
            }
            // we only handle "and" as conjunction between two filters
            if (!this.tokenizer.current().isIdentifier('and')) {
                return;
            } else {
                this.tokenizer.consumeNoArg();
            }
        }
    }

    private parseMediaQueryFilters(result: Section): void {
        // handle filters like
        // e.g. (orientation: landscape)
        this.tokenizer.consumeExpectedSymbol('(');
        if (
            this.tokenizer.current().isIdentifier() &&
            this.tokenizer.next().isSymbol(':')
        ) {
            this.parseMediaQueryFilter(result);
            while (this.tokenizer.next().hasContent('and')) {
                this.tokenizer.consumeExpectedSymbol(')');
                this.tokenizer.consumeNoArg();
                this.tokenizer.consumeExpectedSymbol('(');
                this.parseMediaQueryFilter(result);
            }
        } else {
            this.tokenizer.addError(
                this.tokenizer.current(),
                `Unexpected symbol: '${this.tokenizer
                    .current()
                    .getSource()}'. Expected an attribute filter.`
            );
        }
        this.tokenizer.consumeExpectedSymbol(')');
    }

    private parseMediaQueryFilter(result: Section): void {
        const attr: MediaFilter = new MediaFilter(
            this.tokenizer.consumeNoArg().getContents()
        );
        this.tokenizer.consumeExpectedSymbol(':');
        attr.setExpression(this.parseExpression(true));
        result.addMediaQuery(attr);
    }

    private parseAttribute(): Attribute {
        const attr: Attribute = new Attribute(
            this.tokenizer.consumeNoArg().getContents()
        );
        this.tokenizer.consumeExpectedSymbol(':');
        attr.setExpression(this.parseExpression(true));

        if (
            this.tokenizer.current().isSymbol(';') ||
            !this.tokenizer.next().isSymbol('}')
        ) {
            this.tokenizer.consumeExpectedSymbol(';');
        }
        return attr;
    }

    private parseSelector(): string[] {
        const selector: string[] = [];
        this.parseSelectorPrefix(selector);

        while (this.tokenizer.more()) {
            if (this.tokenizer.current().isSymbol('{', ',')) {
                if (selector.length === 0) {
                    this.tokenizer.addError(
                        this.tokenizer.current(),
                        'Unexpected end of CSS selector'
                    );
                }

                return selector;
            } else if (
                this.tokenizer.current().isIdentifier() ||
                this.tokenizer.current().isSpecialIdentifier('#', '@') ||
                this.tokenizer.current().isNumber()
            ) {
                let str: string = this.tokenizer.consumeNoArg().getSource();
                str = this.parseFilterInSelector(str);
                str = this.parseOperatorInSelector(str);
                selector.push(str);
            } else if (
                this.tokenizer.current().isSymbol('&') ||
                this.tokenizer.current().isSymbol('*')
            ) {
                selector.push(this.tokenizer.consumeNoArg().getTrigger());
            } else if (this.tokenizer.current().isSymbol('>', '+', '~')) {
                selector.push(this.tokenizer.consumeNoArg().getSource());
            } else {
                this.tokenizer.addError(
                    this.tokenizer.current(),
                    `Unexpected Token: ${this.tokenizer.consumeNoArg().getSource()}`
                );
            }
        }
        return selector;
    }

    private parseSelectorPrefix(selector: string[]): void {
        if (this.tokenizer.more() && this.tokenizer.current().isSymbol('[')) {
            let str = '';
            str = this.parseFilterInSelector(str);
            str = this.parseOperatorInSelector(str);
            selector.push(str);
        }
        if (this.tokenizer.more() && this.tokenizer.current().isSymbol('&')) {
            selector.push(this.tokenizer.consumeNoArg().getTrigger());
        }
        if (
            this.tokenizer.more() &&
            (this.tokenizer.current().isSymbol('&:') ||
                this.tokenizer.current().isSymbol('&::'))
        ) {
            this.consumePseudoInSelectorPrefix(selector);
        }
        if (
            this.tokenizer.more() &&
            this.tokenizer.current().isSymbol('::') &&
            this.tokenizer.next().is(TokenType.ID)
        ) {
            this.tokenizer.consumeNoArg();
            selector.push('::' + this.tokenizer.consumeNoArg().getContents());
        }
    }

    private consumePseudoInSelectorPrefix(selector: string[]): void {
        const pseudoOperator: string = this.tokenizer
            .current()
            .getSource()
            .substring(1);
        this.tokenizer.consumeNoArg();
        if (this.tokenizer.current().is(TokenType.ID)) {
            selector.push('&');
            let str: string =
                pseudoOperator + this.tokenizer.consumeNoArg().getContents();
            // consume arguments
            // e.g. :nth-child(2)
            if (this.tokenizer.current().isSymbol('(')) {
                str = this.consumeArgument(str);
            }
            selector.push(str);
        }
    }

    private parseOperatorInSelector(str: string): string {
        while (
            this.tokenizer.current().isSymbol(':') ||
            this.tokenizer.current().isSymbol('::')
        ) {
            str = this.tokenizer.consumeNoArg().getSource();
            str = this.tokenizer.consumeNoArg().getSource();

            // consume arguments
            // e.g. :nth-child(2)
            if (this.tokenizer.current().isSymbol('(')) {
                str = this.consumeArgument(str);
            }
        }
        return str;
    }

    private consumeArgument(str: string): string {
        str = this.tokenizer.consumeNoArg().getSource();
        let braces = 1;
        while (!this.tokenizer.current().isEnd() && braces > 0) {
            if (this.tokenizer.current().isSymbol('(')) {
                braces = braces + 1;
            }
            if (this.tokenizer.current().isSymbol(')')) {
                braces = braces - 1;
            }
            str = this.tokenizer.consumeNoArg().getSource();
        }
        return str;
    }

    private parseFilterInSelector(str: string): string {
        while (this.tokenizer.current().isSymbol('[')) {
            // consume [
            str = this.tokenizer.consumeNoArg().getContents();
            str = this.readAttributeName(str);
            str = this.readOperator(str);
            str = this.readValue(str);
            str = this.readClosingBracket(str);
        }
        return str;
    }

    private readClosingBracket(str: string): string {
        if (!this.tokenizer.current().isSymbol(']')) {
            this.tokenizer.addError(
                this.tokenizer.current(),
                `Unexpected token: '%${this.tokenizer
                    .current()
                    .getSource()}'. Expected: ']'`
            );
        } else {
            str = this.tokenizer.consumeNoArg().getContents();
        }
        return str;
    }

    private readValue(str: string): string {
        if (!this.tokenizer.current().isSymbol(']')) {
            str = this.tokenizer.consumeNoArg().getSource();
        }
        return str;
    }

    private readOperator(str: string): string {
        if (!this.tokenizer.current().isSymbol(']')) {
            if (
                !this.tokenizer.current().isSymbol('=', '~=', '|=', '^=', '$=', '*=')
            ) {
                this.tokenizer.addError(
                    this.tokenizer.current(),
                    `Unexpected token: '%${this.tokenizer
                        .current()
                        .getSource()}'. Expected an operation.`
                );
            }
            str = this.tokenizer.consumeNoArg().getTrigger();
        }
        return str;
    }

    private readAttributeName(str: string): string {
        if (!this.tokenizer.current().isSymbol(']')) {
            if (!this.tokenizer.current().isIdentifier()) {
                this.tokenizer.addError(
                    this.tokenizer.current(),
                    `Unexpected token: '${this.tokenizer
                        .current()
                        .getSource()}'. Expected an attribute name.`
                );
            }
            str = this.tokenizer.consumeNoArg().getContents();
        }
        return str;
    }

    /*
    parses a variable declaration in form of "$variable: value;"
    or "$variable: value !default;"
    */
    private parseVariableDeclaration(): void {
        const variable: Variable = new Variable();
        variable.setName(this.tokenizer.consumeNoArg().getContents());
        this.tokenizer.consumeExpectedSymbol(':');
        variable.setValue(this.parseExpression(true));
        if (
            this.tokenizer.current().isSymbol('!') &&
            this.tokenizer.next().hasContent('default')
        ) {
            variable.setDefaultValue(true);
            this.tokenizer.consumeNoArg();
            this.tokenizer.consumeNoArg();
        }
        this.result.addVariable(variable);
        this.tokenizer.consumeExpectedSymbol(';');
    }

    /*
    parse an expression which could be the value of an attribute or media query
    numeric operations like +,-,*,/,% are supported
    also lists separated by " " will be parsed as ValueList
    */
    private parseExpression(acceptLists: boolean): Expression {
        let expression: Expression = acceptLists
            ? this.parseAtomList()
            : this.parseAtom();
        while (this.tokenizer.more()) {
            if (this.tokenizer.current().isSymbol('+', '-')) {
                expression = new Operation(
                    this.tokenizer.consumeNoArg().getTrigger(),
                    expression,
                    this.parseAtom()
                );
            } else if (this.tokenizer.current().isSymbol('*', '/', '%')) {
                const operation: string = this.tokenizer.consumeNoArg().getTrigger();
                const next: Expression = this.parseAtom();
                expression = this.joinOperations(expression, operation, next);
            } else {
                if (
                    this.tokenizer.current().isSymbol() &&
                    !this.tokenizer.current().isSymbol('!')
                ) {
                    break;
                }
                const list: ValueList = new ValueList(false);
                list.add(expression);
                list.add(acceptLists ? this.parseAtomList() : this.parseAtom());
                expression = list;
            }
        }
        return expression;
    }

    /*
    handle operator precedence by modifying the AST
    */
    private joinOperations(
        result: Expression,
        operation: string,
        next: Expression
    ): Expression {
        if (!(result instanceof Operation)) {
            return new Operation(operation, result, next);
        }
        let farRight: Operation = result as Operation;
        while (farRight.getRight() instanceof Operation) {
            farRight = farRight.getRight() as Operation;
        }
        if (
            !farRight.isProtected() &&
            ('+' === farRight.getOperation() || '-' === farRight.getOperation())
        ) {
            farRight.setRight(new Operation(operation, farRight.getRight(), next));
            return result;
        }
        return new Operation(operation, result, next);
    }

    /*
    parses a list of atoms
    an atom is either one of the following:
    1) an identifier, e.g. "bold"
    2) a number, e.g. 15px
    3) a string e.g. 'OpenSans')
    4) a color, e.g. #454545
    5) other expressions in braces
    */
    private parseAtomList(): Expression {
        const exp: Expression = this.parseAtom();
        if (!this.tokenizer.current().isSymbol(',')) {
            return exp;
        }

        const atomList: ValueList = new ValueList(true);
        atomList.add(exp);
        while (this.tokenizer.current().isSymbol(',')) {
            this.tokenizer.consumeNoArg();
            atomList.add(this.parseAtom());
        }
        return atomList;
    }

    /*
    parses an atom
    an atom is either one of the following:
    1) an identifier, e.g. "bold"
    2) a number, e.g. 15px
    3) a string e.g. 'OpenSans')
    4) a color, e.g. #454545
    5) other expressions in braces
    */
    private parseAtom(): Expression {
        // parse number
        if (this.tokenizer.current().isNumber()) {
            return new Num(this.tokenizer.consumeNoArg().getContents());
        }

        // parse color

        if (this.tokenizer.current().isSpecialIdentifier('#')) {
            const hexString: string = this.tokenizer.consumeNoArg().getSource();
            const matchesLongHexPattern: boolean = new RegExp(
                Color.LONG_RGB_HEX_PATTERN
            ).test(hexString);
            const matchesShortHexPattern: boolean = new RegExp(
                Color.SHORT_RGB_HEX_PATTERN
            ).test(hexString);
            if (matchesLongHexPattern || matchesShortHexPattern) {
                return new Color(hexString);
            } else {
                this.tokenizer.addError(
                    this.tokenizer.current(),
                    "Unexpected token: '" +
                        this.tokenizer.consumeNoArg().getSource() +
                        "'. Expected an color hex string like #a12 or #a3aa31."
                );
            }
        }

        // parse identifier or function call
        if (
            this.tokenizer.current().isIdentifier() ||
            this.tokenizer.current().isString()
        ) {
            return this.parseIdentifierOrFunctionCall();
        }

        // parse as variable reference
        if (this.tokenizer.current().isSpecialIdentifier('$')) {
            return new VariableReference(
                this.tokenizer.consumeNoArg().getContents()
            );
        }

        // parse as braced expressions
        if (this.tokenizer.current().isSymbol('(')) {
            this.tokenizer.consumeExpectedSymbol('(');
            const expression: Expression = this.parseExpression(true);
            this.tokenizer.consumeExpectedSymbol(')');
            if (expression instanceof Operation) {
                (expression as Operation).protect();
            }
            return expression;
        }

        // attributes values may be followed by stuff like "!import"
        // in this case, make a value list
        if (
            this.tokenizer.current().isSymbol('!') &&
            this.tokenizer.next().isIdentifier()
        ) {
            this.tokenizer.consumeExpectedSymbol('!');
            return new Value('!' + this.tokenizer.consumeNoArg().getContents());
        }

        // parsing failed
        // report error
        // return "" as dummy value
        this.tokenizer.addError(
            this.tokenizer.current(),
            "Unexpected token: '" +
                this.tokenizer.consumeNoArg().getSource() +
                "'. Expected an expression."
        );
        return new Value('');
    }

    private parseIdentifierOrFunctionCall(): Expression {
        // identifiers might contain ':'
        // e.g. "identifier:Microsoft.gradient"
        let id = '';

        while (
            this.tokenizer.current().isIdentifier() &&
            this.tokenizer.next().isSymbol(':')
        ) {
            id = id + this.tokenizer.consumeNoArg().getSource() + ':';
            this.tokenizer.consumeNoArg();
        }
        id = id + this.tokenizer.consumeNoArg().getSource();
        if (this.tokenizer.current().isSymbol('(')) {
            // an identifier followed by '(' must be a function call
            const fun: FunctionCall = new FunctionCall();
            fun.setName(id);
            this.tokenizer.consumeExpectedSymbol('(');
            while (
                this.tokenizer.more() &&
                !this.tokenizer.current().isSymbol(')', ';', '{', '}')
            ) {
                if (
                    this.tokenizer.current().isIdentifier() &&
                    this.tokenizer.next().isSymbol('=')
                ) {
                    const name: string = this.tokenizer.consumeNoArg().getContents();
                    this.tokenizer.consumeNoArg();
                    fun.addParameter(
                        new NamedParameter(name, this.parseExpression(false))
                    );
                } else {
                    fun.addParameter(this.parseExpression(false));
                }
                this.consumeExpectedComma();
            }
            this.tokenizer.consumeExpectedSymbol(')');
            return fun;
        }

        // neither function nor value list
        // it is a simple value
        return new Value(id);
    }

    private consumeExpectedComma(): void {
        if (this.tokenizer.current().isSymbol(',')) {
            this.tokenizer.consumeExpectedSymbol(',');
        } else if (!this.tokenizer.current().isSymbol(')')) {
            this.tokenizer.addError(
                this.tokenizer.current(),
                "Unexpected token: '" +
                    this.tokenizer.consumeNoArg().getSource() +
                    "'. Expected a comma between the parameters."
            );
        }
    }

    private parseFunc(): Func {
        this.tokenizer.consumeExpectedKeyword(Parser.KEYWORD_FUNC);
        const func: Func = new Func();
        this.parseName(func);
        this.parseParameterNames(func);
        this.parseFuncAttributes(func);
        return func;
    }

    private parseName(func: Func): void {
        if (this.tokenizer.current().isIdentifier()) {
            func.setName(this.tokenizer.consumeNoArg().getContents());
        } else {
            this.tokenizer.addError(
                this.tokenizer.current(),
                "Unexpected token: '" +
                    this.tokenizer.current().getSource() +
                    "'. Expected the name of the func as identifier."
            );
        }
    }

    private parseFuncAttributes(func: Func): void {
        this.tokenizer.consumeExpectedSymbol('{');
        while (this.tokenizer.more()) {
            if (this.tokenizer.current().isSymbol('}')) {
                this.tokenizer.consumeExpectedSymbol('}');
                return;
            }
            if (this.isAtAttribute()) {
                const attr: Attribute = this.parseAttribute();
                func.addAttribute(attr);
            } else {
                // if it is not an attribute
                // it should a subsection
                this.parseFuncSubSection(func);
            }
        }
        this.tokenizer.consumeExpectedSymbol('}');
    }

    private parseFuncSubSection(func: Func): void {
        const subSection: Section = new Section();
        this.parseSectionSelector(false, subSection);
        this.tokenizer.consumeExpectedSymbol('{');
        while (this.tokenizer.more() && !this.tokenizer.current().isSymbol('}')) {
            if (
                this.tokenizer.current().isIdentifier() &&
                this.tokenizer.next().isSymbol(':')
            ) {
                const attr: Attribute = this.parseAttribute();
                subSection.addAttribute(attr);
            } else {
                this.tokenizer.addError(
                    this.tokenizer.current(),
                    "Unexpected token: '" +
                        this.tokenizer.current().getSource() +
                        "'. Expected an attribute definition"
                );
                this.tokenizer.consumeNoArg();
            }
        }
        this.tokenizer.consumeExpectedSymbol('}');
        func.addSubSection(subSection);
    }

    private parseParameterNames(func: Func): void {
        this.tokenizer.consumeExpectedSymbol('(');
        while (this.tokenizer.more()) {
            if (this.tokenizer.current().isSymbol('{')) {
                this.tokenizer.addError(
                    this.tokenizer.current(),
                    "Unexpected token: '" +
                        this.tokenizer.current().getSource() +
                        "'. Expected ')' to complete the parameter list."
                );
                return;
            }
            if (this.tokenizer.current().isSymbol(')')) {
                this.tokenizer.consumeExpectedSymbol(')');
                return;
            }
            if (this.tokenizer.current().isSpecialIdentifier('$')) {
                func.addParameter(this.tokenizer.consumeNoArg().getContents());
            } else {
                this.tokenizer.addError(
                    this.tokenizer.current(),
                    "Unexpected token: '" +
                        this.tokenizer.consumeNoArg().getSource() +
                        "'. Expected a parameter name like $parameter."
                );
            }
            if (this.tokenizer.current().isSymbol(',')) {
                this.tokenizer.consumeExpectedSymbol(',');
            } else if (!this.tokenizer.current().isSymbol(')')) {
                this.tokenizer.addError(
                    this.tokenizer.current(),
                    "Unexpected token: '" +
                        this.tokenizer.consumeNoArg().getSource() +
                        "'. Expected a comma between the parameter names."
                );
            }
        }
    }

    /*
    parses import statement
    "@import 'test';"
    */
    private parseImport(): void {
        this.tokenizer.consumeExpectedKeyword(Parser.KEYWORD_IMPORT);
        if (!this.tokenizer.current().isString()) {
            this.tokenizer.addError(
                this.tokenizer.current(),
                "Unexpected token: '" +
                    this.tokenizer.current().getSource() +
                    "'. Expected a string constant naming an import file."
            );
        } else {
            this.result.addImport(this.tokenizer.consumeNoArg().getContents());
        }
        this.tokenizer.consumeExpectedSymbol(';');
    }
}
