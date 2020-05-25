import Position from './Position';

export default class Char implements Position {
    private value: string;
    private line: number;
    private pos: number;

    constructor(value: string, line: number, pos: number) {
        this.value = value;
        this.line = line;
        this.pos = pos;
    }

    public getValue(): string {
        return this.value;
    }

    public getLine(): number {
        return this.line;
    }

    public getPos(): number {
        return this.pos;
    }

    public isDigit(): boolean {
        return (
            this.value === '0' ||
            this.value === '1' ||
            this.value === '2' ||
            this.value === '3' ||
            this.value === '4' ||
            this.value === '5' ||
            this.value === '6' ||
            this.value === '7' ||
            this.value === '8' ||
            this.value === '9'
        );
    }

    public isLetter(): boolean {
        const lower: string = this.value.toLowerCase();
        const isLetter =
            lower === 'a' ||
            lower === 'b' ||
            lower === 'c' ||
            lower === 'd' ||
            lower === 'e' ||
            lower === 'f' ||
            lower === 'g' ||
            lower === 'h' ||
            lower === 'i' ||
            lower === 'j' ||
            lower === 'k' ||
            lower === 'l' ||
            lower === 'm' ||
            lower === 'n' ||
            lower === 'o' ||
            lower === 'p' ||
            lower === 'q' ||
            lower === 'r' ||
            lower === 's' ||
            lower === 't' ||
            lower === 'u' ||
            lower === 'v' ||
            lower === 'w' ||
            lower === 'x' ||
            lower === 'y' ||
            lower === 'z';
        return isLetter;
    }

    public isWhitespace(): boolean {
        return this.value === ' ' && !this.isEndOfInput();
    }

    public isNewLine(): boolean {
        return this.value === '\n';
    }

    public isEndOfInput(): boolean {
        return this.value === '\0';
    }

    public toString(): string {
        if (this.isEndOfInput()) {
            return '<End Of Input>';
        } else {
            return this.value;
        }
    }

    public is(...tests: string[]): boolean {
        for (const test of tests) {
            if (test === this.value && test !== '\0') {
                return true;
            }
        }
        return false;
    }

    public getStringValue(): string {
        if (this.isEndOfInput()) {
            return '';
        } else {
            return this.value;
        }
    }
}
