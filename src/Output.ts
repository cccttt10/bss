import fs from 'fs';

export default class Output {
    protected indentLevel = 0;
    protected indentDepth = '    ';
    protected skipOptionalOutput: boolean;
    protected writer: fs.WriteStream = fs.createWriteStream('out.css', {
        flags: 'a', // 'a' means appending (old data will be preserved)
    });

    constructor(writer: fs.WriteStream | null, skipOptionalOutput: boolean) {
        if (writer !== null) {
            this.writer = writer;
        }
        this.skipOptionalOutput = skipOptionalOutput;
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
