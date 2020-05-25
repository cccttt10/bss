import ParseError from './ParseError';

export default abstract class Lookahead<T> {
    protected itemBuffer: Array<T> = [];
    protected endReached = false;
    protected problemCollector: ParseError[] = [];
    protected endOfInputIndicator: T;

    public current(): T {
        const returnVal = this.next(0);
        console.log('next is');
        console.log(returnVal);
        return returnVal;
    }

    // TODO next(), next(int offset)
    public next(offset?: number): T {
        if (typeof offset !== 'number') {
            return this.next(1);
        }
        if (offset < 0) {
            throw new Error('offset < 0');
        }
        while (this.itemBuffer.length <= offset && !this.endReached) {
            const item: T = this.fetch();
            if (item !== null) {
                this.itemBuffer.push(item);
            } else {
                // console.log('fetched item is null')
                this.endReached = true;
            }
        }
        if (offset >= this.itemBuffer.length) {
            if (
                this.endOfInputIndicator === null ||
                this.endOfInputIndicator === undefined
            ) {
                // console.log('endofinputindicator is null inside if')
                this.endOfInputIndicator = this.endOfInput();
            }
            // console.log('will return endofinoutindicator');
            // console.log(this.endOfInputIndicator);
            // console.log(this);
            return this.endOfInputIndicator;
        } else {
            return this.itemBuffer[offset];
        }
    }

    protected abstract endOfInput(): T;

    protected abstract fetch(): T;

    // TODO: public T consume()
    //       public void consume(int numberOfItems)
    public consumeNoArg(): T {
        const result = this.current();
        this.consume(1);
        return result;
    }

    public consume(numberOfItems: number): void {
        if (numberOfItems < 0) {
            throw new Error('numberOfItems < 0');
        }
        while (numberOfItems-- > 0) {
            if (this.itemBuffer.length > 0) {
                this.itemBuffer.shift();
            } else {
                if (this.endReached) {
                    return;
                }
                const item: T = this.fetch();
                if (item === null) {
                    this.endReached = true;
                }
            }
        }
    }

    public getProblemCollector(): ParseError[] {
        return this.problemCollector;
    }

    public setProblemCollector(problemCollector: ParseError[]): void {
        this.problemCollector = problemCollector;
    }
}
