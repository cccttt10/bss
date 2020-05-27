import fs from 'fs';

export default class Output {
    protected indentLevel = 0;
    protected indentDepth = '    ';
    protected skipOptionalOutput: boolean;
    protected readonly writer: fs.WriteStream;

    constructor(
        skipOptionalOutput: boolean,
        outFileName: string = Date.now().toString()
    ) {
        this.skipOptionalOutput = skipOptionalOutput;
        if (!fs.existsSync('./out/')) {
            fs.mkdirSync('./out/');
        }
        const outFile = `./out/${outFileName}.css`;
        if (fs.existsSync(outFile)) {
            fs.unlinkSync(outFile);
        }
        this.writer = fs.createWriteStream(`./out/${outFileName}.css`, {
            flags: 'a',
        });
    }

    public getWriter(): fs.WriteStream {
        return this.writer;
    }

    public output(str: string): Output {
        this.writer.write(str);
        return this;
    }

    public optionalLineBreak(): Output {
        if (this.skipOptionalOutput) {
            this.writer.write(' ');
        } else {
            this.writer.write('\n');
            for (let i = 0; i < this.indentLevel; i++) {
                this.writer.write(this.indentDepth);
            }
        }
        return this;
    }

    public lineBreak(): Output {
        this.writer.write('\n');
        if (!this.skipOptionalOutput) {
            for (let i = 0; i < this.indentLevel; i++) {
                this.writer.write(this.indentDepth);
            }
        }
        return this;
    }

    public incIndent(): Output {
        this.indentLevel = this.indentLevel + 1;
        return this;
    }

    public decIndent(): Output {
        this.indentLevel = this.indentLevel - 1;
        return this;
    }

    public toString(): string {
        return this.writer.toString();
    }
}
