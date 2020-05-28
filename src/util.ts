/* eslint-disable no-console */
import colors from 'colors';

import ParseException from './tokenizer/ParseException';

const success = (info: string): void => {
    console.log(colors.italic(colors.underline(colors.bold(colors.cyan(info)))));
};

const info = (info: string): void => {
    console.log(colors.green(info));
};

const error = (info: string): void => {
    console.log(
        colors.bgRed(
            colors.italic(colors.underline(colors.bold(colors.white(info))))
        )
    );
};

const warn = (info: string): void => {
    console.log(
        colors.bgYellow(
            colors.italic(colors.underline(colors.bold(colors.white(info))))
        )
    );
};

export const stdout = { success: success, info: info, error: error, warn: warn };

export const throwParseException = (parseException: ParseException): void => {
    stdout.error(parseException.toString());
    throw new Error();
};

export const throwRuntimeError = (err: Error): void => {
    stdout.error(err.message);
    stdout.error(err.stack);
    process.exit(1);
};
