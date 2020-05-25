import consola from 'consola';

import ParseException from './tokenizer/ParseException';

export const throwParseException = (parseException: ParseException): void => {
    consola.error(parseException.toString());
    throw new Error();
};
