import Parser from './Parser';
import Char from './tokenizer/Char';
import Reader from './tokenizer/Reader';
import Token from './tokenizer/Token';
import Tokenizer from './tokenizer/Tokenizer';
import TokenType from './tokenizer/TokenType';

/*
subclass Tokenizer to handle css selectors, etc.
*/
export default class BssTokenizer extends Tokenizer {
    constructor(input: Reader) {
        super(input);
        this.setLineComment('//');
        this.setBlockCommentStart('/*');
        this.setBlockCommentEnd('*/');
        this.addSpecialIdStarter('@');
        this.addSpecialIdStarter('$');
        this.addSpecialIdStarter('#');
        this.addKeyword(Parser.KEYWORD_IMPORT);
        this.addKeyword(Parser.KEYWORD_MIXIN);
        this.addKeyword(Parser.KEYWORD_INCLUDE);
        this.addKeyword(Parser.KEYWORD_EXTEND);
        this.addKeyword(Parser.KEYWORD_MEDIA);
        this.addStringDelimiter("'", "'");
    }

    protected fetchNumber(): Token {
        const token: Token = super.fetchNumber();

        /*
        if a number is immediately followed by "%"", "px", "em", "rem", etc.
        it is also a numeric token.
        */
        if (this.input.current().is('%')) {
            token.addToContent(this.input.consumeNoArg());
            return token;
        }
        while (this.input.current().isLetter()) {
            token.addToContent(this.input.consumeNoArg());
        }

        return token;
    }

    protected handleStringEscape(
        separator: string,
        escapeChar: string,
        stringToken: Token
    ): boolean {
        // all escaped chars should be preserved in original form...
        stringToken.addToContent(this.input.consumeNoArg());
        return true;
    }

    protected isAtBracket(inSymbol: boolean): boolean {
        /*
        treat "%" as single symbol
        so that "10%;" is not tokenized to "10", "%;"
        but to "10", "%", ";"
        method name may be a bit misleading
        */
        return super.isAtBracket(inSymbol) || this.input.current().is('%');
    }

    protected isAtStartOfIdentifier(): boolean {
        if (super.isAtStartOfIdentifier()) {
            return true;
        }
        /*
        support vendor specific and class selectors
        e.g. -moz-border-radius or .test
        */
        return (
            (this.input.current().is('-') || this.input.current().is('.')) &&
            this.input.next().isLetter()
        );
    }

    protected isIdentifierChar(current: Char): boolean {
        if (super.isIdentifierChar(current)) {
            return true;
        }
        /*
        selectors can contain "-", "." or "#"
        as long as it is not the last char of the token
        */
        return (
            (current.is('-') || current.is('.') || current.is('#')) &&
            !this.input.next().isWhitespace()
        );
    }

    protected isSymbolCharacter(ch: Char): boolean {
        return super.isSymbolCharacter(ch) && !ch.is('#');
    }

    protected fetchSymbol(): Token {
        const result: Token = Token.create(TokenType.SYMBOL, this.input.current());
        result.addToTrigger(this.input.consumeNoArg());
        while (
            this.isSymbolCharacter(this.input.current()) &&
            !this.input.current().is(',')
        ) {
            result.addToTrigger(this.input.consumeNoArg());
        }
        return result;
    }
}
