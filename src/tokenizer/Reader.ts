import { readFileSync } from 'fs';

export default class Reader {
    private content: string;
    private index = 0;

    constructor(filename: string) {
        this.content = readFileSync(filename, 'utf-8');
    }

    public read(): number | string {
        if (this.index === this.content.length) {
            return -1;
        }
        const curIndex = this.index;
        this.index = this.index + 1;
        return this.content.charAt(curIndex);
    }
}
