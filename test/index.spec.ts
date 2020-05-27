import { expect } from 'chai';
import fs from 'fs';

import Generator from '../src/Generator';
import Output from '../src/Output';

describe('test', () => {
    it('should compile the given bss files into css files', () => {
        const filenames: string[] = ['extends', 'function', 'nesting', 'variables'];
        const stylesheetsDir = './test/stylesheets/';
        for (const filename of filenames) {
            const gen: Generator = new Generator();
            gen.importStylesheetByName(`${stylesheetsDir}bss/${filename}.bss`);
            gen.compile();
            const output: Output = new Output(false, filename);
            gen.generate(output);
            output.getWriter().on('end', () => {
                const expected = fs.readFileSync(
                    `${stylesheetsDir}css/${filename}.css`
                );
                const actual = fs.readFileSync(`./out/${filename}.css`);
                expect(actual.toString()).to.equal(expected.toString());
            });
        }
    });
});
