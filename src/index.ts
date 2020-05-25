import Generator from './Generator';
import Output from './Output';

const gen: Generator = new Generator();
gen.importStylesheetByName('selectors.bss');
gen.compile();

const output = new Output(null, false);
gen.generate(output);
