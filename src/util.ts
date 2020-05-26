/* eslint-disable no-console */
import colors from 'colors';
import consola from 'consola';

import ParseException from './tokenizer/ParseException';

export const throwParseException = (parseException: ParseException): void => {
    consola.error(parseException.toString());
    throw new Error();
};

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

export const stdout = { success: success, info: info, error: error };
