// streamMockAgent client.
// npx ts-node -r tsconfig-paths/register test/stream_client.ts

import test from "node:test";
import assert from "node:assert";

import { DefaultEndOfStreamDelimiter } from "@/type";
import { ChunkParser } from "@receptron/stream_utils";

import { useTestServer, testServerUrl } from "./helpers/server";

useTestServer();

async function* streamChatCompletion(url: string, postData: any) {
  const completion = await fetch(url, {
    headers: {
      "Content-Type": "text/event-stream",
    },
    method: "POST",
    body: JSON.stringify(postData),
  });

  const reader = completion.body?.getReader();

  if (completion.status !== 200 || !reader) {
    throw new Error("Request failed");
  }

  const decoder = new TextDecoder("utf-8");
  let done = false;
  while (!done) {
    const { done: readDone, value } = await reader.read();
    if (readDone) {
      done = readDone;
      reader.releaseLock();
    } else {
      const token = decoder.decode(value, { stream: true });
      yield token;
    }
  }
}

const streamingRequest = async (url: string, postData: any, messages: string[]) => {
  const generator = streamChatCompletion(url, postData);

  for await (const token of generator) {
    // callback to stream filter
    if (token) {
      messages.push(token);
      if (messages.join("").indexOf(DefaultEndOfStreamDelimiter) === -1) {
        console.log(token);
      }
    }
  }
  const last = messages[messages.length - 1] as any;
  if (last && last.indexOf(DefaultEndOfStreamDelimiter) === -1) {
    const lastData = JSON.parse(last);
    if (lastData.type && lastData.type === "content") {
      return lastData.data;
    }
  }

  const payload_data = messages.join("").split(DefaultEndOfStreamDelimiter)[1];
  if (payload_data) {
    const data = JSON.parse(payload_data);
    console.log(data);
    return data;
  }
};

test("test stream echo agent graph 1", async () => {
  // stream dispatcher
  const messages: string[] = [];
  await streamingRequest(
    testServerUrl("/api/graph"),
    {
      graphData: {
        version: 0.5,
        nodes: {
          echo: {
            agent: "streamMockAgent",
            params: {
              message: "hello",
            },
          },
        },
      },
    },
    messages,
  );
});

test("test stream echo agent graph 2", async () => {
  const messages: string[] = [];
  const content = await streamingRequest(
    testServerUrl("/api/graph/stream"),
    {
      graphData: {
        version: 0.5,
        nodes: {
          echo: {
            isResult: true,
            agent: "streamMockAgent",
            params: {
              message: "hello",
            },
          },
          echo2: {
            isResult: true,
            agent: "streamMockAgent",
            params: {
              message: "thank you!",
            },
          },
        },
      },
    },
    messages,
  );

  const result: Record<string, string> = {
    echo: "",
    echo2: "",
  };
  const parser = new ChunkParser();
  messages
    .map(parser.read)
    .flat(2)
    .forEach((response) => {
      if (response.type === "agent") {
        const nodeId = response.nodeId as string;
        result[nodeId] = (result[nodeId] ?? "") + response?.token;
      }
      if (response.type === "content") {
        assert.deepStrictEqual(response, {
          type: "content",
          data: { echo: { message: "hello" }, echo2: { message: "thank you!" } },
        });
      }
    });
  assert.deepStrictEqual(result, { echo: "hello", echo2: "thank you!" });
  assert.deepStrictEqual(content, { echo: { message: "hello" }, echo2: { message: "thank you!" } });
});
