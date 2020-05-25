import Char from './Char';
import Lookahead from './Lookahead';
import Reader from './Reader';

export default class LookaheadReader extends Lookahead<Char> {
    private input: Reader;
    private line = 1;
    private pos = 0;

    constructor(input: Reader) {
        super();
        console.log('look aheader reader is init');
        console.log(input);
        if (input === null || input === undefined) {
            throw new Error('input must not be null');
        }
    }

    protected endOfInput(): Char {
        return new Char('\0', this.line, this.pos);
    }

    // TODO: no try
    protected fetch(): Char {
        console.log(this);
        const character: number | string = this.input.read();
        if (character === -1) {
            return null;
        }
        if (character === '\n') {
            this.line = this.line + 1;
            this.pos = 0;
        }
        this.pos = this.pos + 1;
        return new Char(character as string, this.line, this.pos);
    }

    public toString(): string {
        if (this.itemBuffer.length === 0) {
            return this.line + ':' + this.pos + ': Buffer empty';
        }
        if (this.itemBuffer.length < 2) {
            return this.line + ':' + this.pos + ': ' + this.current();
        }
        return (
            this.line + ':' + this.pos + ': ' + this.current() + ', ' + this.next()
        );
    }
}
