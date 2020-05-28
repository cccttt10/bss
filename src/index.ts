import path from 'path';

import Generator from './Generator';
import Output from './Output';
import { throwRuntimeError } from './util';

const gen: Generator = new Generator();
const inputFilePath = process.argv[2];
if (!inputFilePath.includes('.bss')) {
    throwRuntimeError(new Error('The file you provided is not a .bss file!'));
}
const filename = path.basename(inputFilePath).replace('.bss', '');

gen.importStylesheetByName(inputFilePath);
gen.compile();

const output: Output = new Output(false, filename);
gen.generate(output);
