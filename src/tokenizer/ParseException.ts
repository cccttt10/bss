import ParseError from './ParseError';

export default class ParseException {
    private readonly message: string;
    private readonly errors: ParseError[];

    private constructor(message: string, errors: ParseError[]) {
        this.message = message;
        this.errors = errors;
    }

    public static create(errors: ParseError[]): ParseException {
        if (errors.length === 1) {
            return new ParseException(errors[0].getMessage(), errors);
        } else if (errors.length > 1) {
            return new ParseException(
                `${errors.length} occurred. First: ${errors[0].getMessage()}`,
                errors
            );
        } else {
            return new ParseException('An unknown error occurred', errors);
        }
    }

    public getErrors(): ParseError[] {
        return this.errors;
    }

    public toString(): string {
        let str: string;
        for (const error of this.errors) {
            if (str.length > 0) {
                str += '\n';
            }
            str += error.toString();
        }
        return str;
    }
}
