export type ChunkData = {
  type: "agent";
  nodeId: string;
  agentId: string;
  token: string;
};

export type ContentData<T = any> = {
  type: "content";
  data: T;
};

export type StreamData = ChunkData | ContentData;

export class ChunkParser {
  private buffer: string = "";

  constructor() {
    this.read = this.read.bind(this);
  }

  public read(text: string) {
    this.buffer = this.buffer + text;

    const ret: StreamData[] = [];
    let res: StreamData | null;
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

  private parse(): StreamData | null {
    for (let currentPos = 0; currentPos < this.buffer.length; currentPos++) {
      if (this.buffer[currentPos] === "}") {
        const expectJson = this.buffer.slice(0, currentPos + 1);
        try {
          const ret: StreamData = JSON.parse(expectJson);
          this.buffer = this.buffer.slice(currentPos + 1);
          return ret;
        } catch (__e) {
          // nothing record.
        }
      }
    }
    return null;
  }
}
