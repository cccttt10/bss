import Char from './Char';
import Position from './Position';
import TokenType from './TokenType';

export default class Token implements Position {
    private type: TokenType;
    private trigger = '';
    private internTrigger: string = null;
    private contents = '';
    private source = '';

    private line: number;
    protected pos: number;

    // TODO: private Token constructor

    public static create(type: TokenType, pos: Position): Token {
        const result: Token = new Token();
        result.type = type;
        result.line = pos.getLine();
        result.pos = pos.getPos();
        return result;
    }

    public static createAndFill(type: TokenType, ch: Char): Token {
        const result: Token = new Token();
        result.type = type;
        result.line = ch.getLine();
        result.pos = ch.getPos();
        result.contents = ch.getStringValue();
        result.trigger = ch.getStringValue();
        result.source = ch.toString();
        return result;
    }

    public addToTrigger(ch: Char): Token {
        this.trigger = this.trigger + ch.getValue();
        this.internTrigger = null;
        this.source = this.source + ch.getValue();
        return this;
    }

    public addToSource(ch: Char): Token {
        this.source = this.source + ch.getValue();
        return this;
    }

    // TODO: addToContent char and Char, method overloading
    public addToContent(ch: Char | string): Token {
        if (ch instanceof Char) {
            return this.addToContent(ch.getValue());
        } else {
            this.contents = this.contents + ch;
            this.source = this.source + ch;
            return this;
        }
    }

    public silentAddToContent(ch: string): Token {
        this.contents = this.contents + ch;
        return this;
    }

    // TODO: intern
    public getTrigger(): string {
        if (this.internTrigger === null) {
            this.internTrigger = this.trigger;
        }
        return this.internTrigger;
    }

    public getType(): TokenType {
        return this.type;
    }

    public getContents(): string {
        return this.contents;
    }

    public getSource(): string {
        return this.source;
    }

    public getLine(): number {
        return this.line;
    }

    public getPos(): number {
        return this.pos;
    }

    public setTrigger(trigger: string): void {
        this.trigger = trigger;
        this.internTrigger = null;
    }

    public setContents(contents: string): void {
        this.contents = contents;
    }

    public setSource(source: string): void {
        this.source = source;
    }

    public isEnd(): boolean {
        return this.type === TokenType.EOI;
    }

    public isNotEnd(): boolean {
        return this.type !== TokenType.EOI;
    }

    // TODO: trigger.intern()
    public matches(type: TokenType, trigger: string): boolean {
        if (!this.is(type)) {
            return false;
        }
        if (this.trigger === null) {
            throw new Error('trigger must no be null');
        }
        return this.getTrigger() === trigger;
    }

    // TODO: aTrigger.intern()
    public wasTriggeredBy(...triggers: string[]): boolean {
        if (triggers.length === 0) {
            return false;
        }
        for (const aTrigger of triggers) {
            if (aTrigger !== null && aTrigger === this.getTrigger()) {
                return true;
            }
        }
        return false;
    }

    // TODO: equalsIgnoreCase
    public hasContent(content: string): boolean {
        if (content === null) {
            throw new Error('content must not be null');
        }
        return content.toLowerCase() === this.getContents().toLowerCase();
    }

    public is(type: TokenType): boolean {
        return this.type === type;
    }

    public isSymbol(...symbols: string[]): boolean {
        if (symbols.length === 0) {
            return this.is(TokenType.SYMBOL);
        }
        for (const symbol of symbols) {
            if (this.matches(TokenType.SYMBOL, symbol)) {
                return true;
            }
        }
        return false;
    }

    public isKeyword(...keywords: string[]): boolean {
        if (keywords.length === 0) {
            return this.is(TokenType.KEYWORD);
        }
        for (const keyword of keywords) {
            if (this.matches(TokenType.KEYWORD, keyword)) {
                return true;
            }
        }
        return false;
    }

    public isIdentifier(...values: string[]): boolean {
        if (values.length === 0) {
            return this.is(TokenType.ID);
        }
        for (const value of values) {
            if (this.matches(TokenType.ID, value)) {
                return true;
            }
        }
        return false;
    }

    public isSpecialIdentifier(...triggers: string[]): boolean {
        if (triggers.length === 0) {
            return this.is(TokenType.SPECIAL_ID);
        }
        for (const possibleTrigger of triggers) {
            if (this.matches(TokenType.SPECIAL_ID, possibleTrigger)) {
                return true;
            }
        }
        return false;
    }

    public isSpecialIdentifierWithContent(
        trigger: string,
        ...contents: string[]
    ): boolean {
        if (!this.matches(TokenType.SPECIAL_ID, trigger)) {
            return false;
        }
        if (contents.length === 0) {
            return true;
        }
        for (const content of contents) {
            if (content !== null && content === this.getContents()) {
                return true;
            }
        }
        return false;
    }

    public isInteger(): boolean {
        return this.is(TokenType.INTEGER);
    }

    public isDecimal(): boolean {
        return this.is(TokenType.DECIMAL);
    }

    public isScientificDecimal(): boolean {
        return this.is(TokenType.SCIENTIFIC_DECIMAL);
    }

    public isNumber(): boolean {
        return this.isInteger() || this.isDecimal() || this.isScientificDecimal();
    }

    public isString(): boolean {
        return this.is(TokenType.STRING);
    }

    public toString(): string {
        return (
            'type: ' +
            this.getType().toString() +
            '\n' +
            'source: ' +
            this.getSource() +
            '\n' +
            'contents: ' +
            this.getContents() +
            '\n' +
            'trigger: ' +
            `|${this.getTrigger()}|` +
            '\n' +
            `${this.line},${this.pos}`
        );
    }
}
