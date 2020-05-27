import { stdout } from '../util';
import Char from './Char';
import Lookahead from './Lookahead';
import LookaheadReader from './LookaheadReader';
import ParseError from './ParseError';
import ParseException from './ParseException';
import Position from './Position';
import Reader from './Reader';
import Severity from './Severity';
import Token from './Token';
import TokenType from './TokenType';

export default class Tokenizer extends Lookahead<Token> {
    protected input: LookaheadReader;
    private decimalSeparator = '.';
    private effectiveDecimalSeparator = '.';
    private groupingSeparator = '_';
    private scientificNotationSeparator = 'e';
    private alternateScientificNotationSeparator = 'E';
    private effectiveScientificNotationSeparator = 'e';
    private lineComment = '//';
    private blockCommentStart = '/*';
    private blockCommentEnd = '*/';
    private brackets = ['(', '[', '{', '}', ']', ')'];
    private treatSinglePipeAsBracket = true;
    private specialIdStarters = new Set<string>();
    private specialIdTerminators = new Set<string>();
    private keywords = new Map<string, string>();
    private keywordsCaseSensitive = false;
    private stringDelimiters = new Map<string, string>();

    constructor(input: Reader) {
        super();
        this.input = new LookaheadReader(input);
        this.input.setProblemCollector(this.problemCollector);

        // set up default string handling
        this.addStringDelimiter('"', '\\');
        this.addStringDelimiter("'", '\0');
    }

    public setProblemCollector(problemCollector: ParseError[]): void {
        super.setProblemCollector(problemCollector);
        this.input.setProblemCollector(problemCollector);
    }

    protected endOfInput(): Token {
        return Token.createAndFill(TokenType.EOI, this.input.current());
    }

    protected fetch(): Token {
        // fetch and ignore any whitespace
        while (this.input.current().isWhitespace()) {
            this.input.consumeNoArg();
        }

        // end of input reached? Pass end of input signal on...
        if (this.input.current().isEndOfInput()) {
            return null;
        }

        // handle (and ignore) line comments
        if (this.isAtStartOfLineComment(true)) {
            this.skipToEndOfLine();
            return this.fetch();
        }

        // handle (and ignore) block comments
        if (this.isAtStartOfBlockComment(true)) {
            this.skipBlockComment();
            return this.fetch();
        }

        // a digit signals the start of a number
        if (this.isAtStartOfNumber()) {
            return this.fetchNumber();
        }

        // a letter signals the start of an id
        if (this.isAtStartOfIdentifier()) {
            return this.fetchId();
        }

        // a " or ' (or whatever string delimiters are used...) start a string constant
        if (this.stringDelimiters.has(this.input.current().getValue())) {
            return this.fetchString();
        }

        // treat brackets as special symbols: (( will create two consecutive symbols but ** will create a single
        // symbol "**".
        if (this.isAtBracket(false)) {
            return Token.createAndFill(TokenType.SYMBOL, this.input.consumeNoArg());
        }

        // check if the current character starts a special ID
        if (this.isAtStartOfSpecialId()) {
            return this.fetchSpecialId();
        }

        // read all symbol characters and form a SYMBOL of it
        if (this.isSymbolCharacter(this.input.current())) {
            return this.fetchSymbol();
        }

        this.problemCollector.push(
            ParseError.error(
                this.input.current(),
                `Invalid character in input: ${this.input
                    .current()
                    .getStringValue()}`
            )
        );
        this.input.consumeNoArg();
        return this.fetch();
    }

    protected isAtStartOfSpecialId(): boolean {
        return this.specialIdStarters.has(this.input.current().getValue());
    }

    protected isAtStartOfNumber(): boolean {
        return (
            this.input.current().isDigit() ||
            (this.input.current().is('-') && this.input.next().isDigit()) ||
            (this.input.current().is('-') &&
                this.input.next().is('.') &&
                this.input.next(2).isDigit()) ||
            (this.input.current().is('.') && this.input.next().isDigit())
        );
    }

    protected isAtBracket(inSymbol: boolean): boolean {
        return (
            this.input.current().is(...this.brackets) ||
            (!inSymbol &&
                this.treatSinglePipeAsBracket &&
                this.input.current().is('|') &&
                !this.input.next().is('|'))
        );
    }

    protected canConsumeThisString(str: string, consume: boolean): boolean {
        if (str === null || str === undefined) {
            return false;
        }
        for (let i = 0; i < str.length; i++) {
            if (!this.input.next(i).is(str.charAt(i))) {
                return false;
            }
        }
        if (consume) {
            this.input.consume(str.length);
        }
        return true;
    }

    protected isAtStartOfLineComment(consume: boolean): boolean {
        if (this.lineComment !== null && this.lineComment !== undefined) {
            return this.canConsumeThisString(this.lineComment, consume);
        } else {
            return false;
        }
    }

    protected skipToEndOfLine(): void {
        while (
            !this.input.current().isEndOfInput() &&
            !this.input.current().isNewLine()
        ) {
            this.input.consumeNoArg();
        }
    }

    protected isAtStartOfBlockComment(consume: boolean): boolean {
        return this.canConsumeThisString(this.blockCommentStart, consume);
    }

    protected isAtEndOfBlockComment(): boolean {
        return this.canConsumeThisString(this.blockCommentEnd, true);
    }

    protected skipBlockComment(): void {
        while (!this.input.current().isEndOfInput()) {
            if (this.isAtEndOfBlockComment()) {
                return;
            }
            this.input.consumeNoArg();
        }
        this.problemCollector.push(
            ParseError.error(this.input.current(), 'Premature end of block comment')
        );
    }

    protected fetchString(): Token {
        const separator: string = this.input.current().getValue();
        const escapeChar: string = this.stringDelimiters.get(
            this.input.current().getValue()
        );
        const result: Token = Token.create(TokenType.STRING, this.input.current());
        result.addToTrigger(this.input.consumeNoArg());

        while (
            !this.input.current().isNewLine() &&
            !this.input.current().is(separator) &&
            !this.input.current().isEndOfInput()
        ) {
            if (escapeChar !== '\0' && this.input.current().is(escapeChar)) {
                result.addToSource(this.input.consumeNoArg());
                if (!this.handleStringEscape(separator, escapeChar, result)) {
                    this.problemCollector.push(
                        ParseError.error(
                            this.input.next(),
                            `Cannot use '${this.input
                                .next()
                                .getStringValue()}' as escaped character`
                        )
                    );
                }
            } else {
                result.addToContent(this.input.consumeNoArg());
            }
        }

        if (this.input.current().is(separator)) {
            result.addToSource(this.input.consumeNoArg());
        } else {
            this.problemCollector.push(
                ParseError.error(
                    this.input.current(),
                    'Premature end of string constant'
                )
            );
        }
        return result;
    }

    protected handleStringEscape(
        separator: string,
        escapeChar: string,
        stringToken: Token
    ): boolean {
        if (this.input.current().is(separator)) {
            stringToken.addToContent(separator);
            stringToken.addToSource(this.input.consumeNoArg());
            return true;
        } else if (this.input.current().is(escapeChar)) {
            stringToken.silentAddToContent(escapeChar);
            stringToken.addToSource(this.input.consumeNoArg());
            return true;
        } else if (this.input.current().is('n')) {
            stringToken.silentAddToContent('\n');
            stringToken.addToSource(this.input.consumeNoArg());
            return true;
        } else if (this.input.current().is('r')) {
            stringToken.silentAddToContent('\r');
            stringToken.addToSource(this.input.consumeNoArg());
            return true;
        } else {
            return false;
        }
    }

    protected isAtStartOfIdentifier(): boolean {
        return this.input.current().isLetter();
    }

    protected fetchId(): Token {
        const result: Token = Token.create(TokenType.ID, this.input.current());
        result.addToContent(this.input.consumeNoArg());
        while (this.isIdentifierChar(this.input.current())) {
            result.addToContent(this.input.consumeNoArg());
        }
        if (
            !this.input.current().isEndOfInput() &&
            this.specialIdTerminators.has(this.input.current().getValue())
        ) {
            const specialId: Token = Token.create(TokenType.SPECIAL_ID, result);
            specialId.setTrigger(this.input.current().getStringValue());
            specialId.setContents(result.getContents());
            specialId.setSource(result.getContents());
            specialId.addToSource(this.input.current());
            this.input.consumeNoArg();
            return this.handleKeywords(specialId);
        }
        return this.handleKeywords(result);
    }

    protected handleKeywords(idToken: Token): Token {
        const keyword: string = this.keywords.get(
            this.keywordsCaseSensitive
                ? idToken.getContents()
                : idToken.getContents().toLowerCase()
        );
        if (keyword !== null && keyword !== undefined) {
            const keywordToken: Token = Token.create(TokenType.KEYWORD, idToken);
            keywordToken.setTrigger(keyword);
            keywordToken.setContents(idToken.getContents());
            keywordToken.setSource(idToken.getSource());
            return keywordToken;
        }
        return idToken;
    }

    protected isIdentifierChar(current: Char): boolean {
        return current.isDigit() || current.isLetter() || current.is('_');
    }

    protected fetchSpecialId(): Token {
        const result: Token = Token.create(
            TokenType.SPECIAL_ID,
            this.input.current()
        );
        result.addToTrigger(this.input.consumeNoArg());
        while (this.isIdentifierChar(this.input.current())) {
            result.addToContent(this.input.consumeNoArg());
        }
        return this.handleKeywords(result);
    }

    protected fetchSymbol(): Token {
        const result: Token = Token.create(TokenType.SYMBOL, this.input.current());
        result.addToTrigger(this.input.consumeNoArg());
        if (
            (result.isSymbol('*') && this.input.current().is('*')) ||
            (result.isSymbol('&') && this.input.current().is('&')) ||
            (result.isSymbol('|') && this.input.current().is('|')) ||
            (result.isSymbol() && this.input.current().is('='))
        ) {
            result.addToTrigger(this.input.consumeNoArg());
        }
        return result;
    }

    protected isSymbolCharacter(ch: Char): boolean {
        if (
            ch.isEndOfInput() ||
            ch.isDigit() ||
            ch.isLetter() ||
            ch.isWhitespace()
        ) {
            return false;
        }
        return !(
            this.isAtBracket(true) ||
            this.isAtStartOfBlockComment(false) ||
            this.isAtStartOfLineComment(false) ||
            this.isAtStartOfNumber() ||
            this.isAtStartOfIdentifier() ||
            this.stringDelimiters.has(ch.getValue())
        );
    }

    protected fetchNumber(): Token {
        let result: Token = Token.create(TokenType.INTEGER, this.input.current());
        result.addToContent(this.input.consumeNoArg());
        while (
            this.input.current().isDigit() ||
            this.input.current().is(this.decimalSeparator) ||
            (this.input.current().is(this.groupingSeparator) &&
                this.input.next().isDigit()) ||
            ((this.input.current().is(this.scientificNotationSeparator) ||
                this.input
                    .current()
                    .is(this.alternateScientificNotationSeparator)) &&
                (this.input.next().isDigit() ||
                    this.input.next().is('+') ||
                    this.input.next().is('-')))
        ) {
            if (this.input.current().is(this.groupingSeparator)) {
                result.addToSource(this.input.consumeNoArg());
            } else if (this.input.current().is(this.decimalSeparator)) {
                if (
                    result.is(TokenType.DECIMAL) ||
                    result.is(TokenType.SCIENTIFIC_DECIMAL)
                ) {
                    this.problemCollector.push(
                        ParseError.error(
                            this.input.current(),
                            'Unexpected decimal separators'
                        )
                    );
                } else {
                    const decimalToken: Token = Token.create(
                        TokenType.DECIMAL,
                        result
                    );
                    decimalToken.setContents(
                        result.getContents() + this.effectiveDecimalSeparator
                    );
                    decimalToken.setSource(result.getSource());
                    result = decimalToken;
                }
                result.addToSource(this.input.consumeNoArg());
            } else if (
                this.input.current().is(this.scientificNotationSeparator) ||
                this.input.current().is(this.alternateScientificNotationSeparator)
            ) {
                if (result.is(TokenType.SCIENTIFIC_DECIMAL)) {
                    this.problemCollector.push(
                        ParseError.error(
                            this.input.current(),
                            'Unexpected scientific notation separators'
                        )
                    );
                } else {
                    const scientificDecimalToken: Token = Token.create(
                        TokenType.SCIENTIFIC_DECIMAL,
                        result
                    );
                    scientificDecimalToken.setContents(
                        result.getContents() +
                            this.effectiveScientificNotationSeparator
                    );
                    scientificDecimalToken.setSource(
                        result.getSource() +
                            this.effectiveScientificNotationSeparator
                    );
                    result = scientificDecimalToken;
                    this.input.consumeNoArg();
                    if (
                        this.input.current().is('+') ||
                        this.input.current().is('-')
                    ) {
                        result.addToContent(this.input.consumeNoArg());
                    }
                }
            } else {
                result.addToContent(this.input.consumeNoArg());
            }
        }
        return result;
    }

    public isKeywordsCaseSensitive(): boolean {
        return this.keywordsCaseSensitive;
    }

    public setKeywordsCaseSensitive(keywordsCaseSensitive: boolean): void {
        this.keywordsCaseSensitive = keywordsCaseSensitive;
    }

    public addKeyword(keyword: string): void {
        this.keywords.set(
            this.keywordsCaseSensitive ? keyword : keyword.toLowerCase(),
            keyword
        );
    }

    public addSpecialIdStarter(character: string): void {
        this.specialIdStarters.add(character);
    }

    public addSpecialIdTerminator(character: string): void {
        this.specialIdTerminators.add(character);
    }

    public clearStringDelimiters(): void {
        this.stringDelimiters.clear();
    }

    public addStringDelimiter(
        stringDelimiter: string,
        escapeCharacter: string
    ): void {
        this.stringDelimiters.set(stringDelimiter, escapeCharacter);
    }

    public addUnescapedStringDelimiter(stringDelimiter: string): void {
        this.stringDelimiters.set(stringDelimiter, '\0');
    }

    public getDecimalSeparator(): string {
        return this.decimalSeparator;
    }

    public setDecimalSeparator(decimalSeparator: string): void {
        this.decimalSeparator = decimalSeparator;
    }

    public getEffectiveDecimalSeparator(): string {
        return this.effectiveDecimalSeparator;
    }

    public setEffectiveDecimalSeparator(effectiveDecimalSeparator: string): void {
        this.effectiveDecimalSeparator = effectiveDecimalSeparator;
    }

    public getGroupingSeparator(): string {
        return this.groupingSeparator;
    }

    public setGroupingSeparator(groupingSeparator: string): void {
        this.groupingSeparator = groupingSeparator;
    }

    public getLineComment(): string {
        return this.lineComment;
    }

    public setLineComment(lineComment: string): void {
        this.lineComment = lineComment;
    }

    public getBlockCommentStart(): string {
        return this.blockCommentStart;
    }

    public setBlockCommentStart(blockCommentStart: string): void {
        this.blockCommentStart = blockCommentStart;
    }

    public getBlockCommentEnd(): string {
        return this.blockCommentEnd;
    }

    public setBlockCommentEnd(blockCommentEnd: string): void {
        this.blockCommentEnd = blockCommentEnd;
    }

    public toString(): string {
        if (this.itemBuffer.length === 0) {
            return 'No Token fetched...';
        }
        if (this.itemBuffer.length < 2) {
            return 'Current: ' + this.current();
        }
        return (
            'Current: ' +
            this.current().toString() +
            ', Next: ' +
            this.next().toString()
        );
    }

    public more(): boolean {
        return this.current().isNotEnd();
    }

    public atEnd(): boolean {
        return this.current().isEnd();
    }

    public addError(pos: Position, message: string): void {
        this.getProblemCollector().push(ParseError.error(pos, message));
    }

    public addWarning(pos: Position, message: string): void {
        this.getProblemCollector().push(ParseError.warning(pos, message));
    }

    public consumeExpectedSymbol(symbol: string): void {
        if (this.current().matches(TokenType.SYMBOL, symbol)) {
            this.consumeNoArg();
        } else {
            this.addError(
                this.current(),
                `Unexpected token: ${this.current().getSource()}. Expected: ${symbol}`
            );
        }
    }

    public consumeExpectedKeyword(keyword: string): void {
        if (this.current().matches(TokenType.KEYWORD, keyword)) {
            this.consumeNoArg();
        } else {
            this.addError(
                this.current(),
                `Unexpected token: ${this.current().getSource()}. Expected: ${keyword}`
            );
        }
    }

    public throwOnErrorOrWarning(): void {
        if (this.getProblemCollector().length > 0) {
            stdout.error(
                ParseException.create(this.getProblemCollector()).toString()
            );
            throw new Error();
        }
    }

    public throwOnError(): void {
        for (const e of this.getProblemCollector()) {
            if (e.getSeverity() === Severity.ERROR) {
                stdout.error(
                    ParseException.create(this.getProblemCollector()).toString()
                );
                throw new Error();
            }
        }
    }
}
