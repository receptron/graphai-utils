"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkParser = void 0;
class ChunkParser {
    constructor() {
        this.buffer = "";
        this.read = this.read.bind(this);
    }
    read(text) {
        this.buffer = this.buffer + text;
        const ret = [];
        let res;
        do {
            res = null;
            if (this.buffer.slice(0, 1) === "{") {
                res = this.parse();
                if (res) {
                    ret.push(res);
                }
            }
        } while (res && this.buffer.length > 0);
        return ret;
    }
    parse() {
        for (let currentPos = 0; currentPos < this.buffer.length; currentPos++) {
            if (this.buffer[currentPos] === "}") {
                const expectJson = this.buffer.slice(0, currentPos + 1);
                try {
                    const ret = JSON.parse(expectJson);
                    this.buffer = this.buffer.slice(currentPos + 1);
                    return ret;
                }
                catch (__e) {
                    // nothing record.
                }
            }
        }
        return null;
    }
}
exports.ChunkParser = ChunkParser;
