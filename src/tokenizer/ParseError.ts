import Position from './Position';
import Severity from './Severity';

export default class ParseError {
    private pos: Position;
    private message: string;
    private readonly severity: Severity;

    protected constructor(pos: Position, message: string, severity: Severity) {
        this.pos = pos;
        this.message = message;
        this.severity = severity;
    }

    public static warning(pos: Position, msg: string): ParseError {
        let message: string = msg;
        if (pos.getLine() > 0) {
            message = `line ${pos.getLine()} position ${pos.getPos()} ${msg}`;
        }
        return new ParseError(pos, message, Severity.WARNING);
    }

    public static error(pos: Position, msg: string): ParseError {
        let message: string = msg;
        if (pos.getLine() > 0) {
            message = `line ${pos.getLine()} position ${pos.getPos()} ${msg}`;
        }
        return new ParseError(pos, message, Severity.ERROR);
    }

    public getPosition(): Position {
        return this.pos;
    }

    public getMessage(): string {
        return this.message;
    }

    public getSeverity(): Severity {
        return this.severity;
    }

    public toString(): string {
        return this.severity.toString() + this.message;
    }
}
