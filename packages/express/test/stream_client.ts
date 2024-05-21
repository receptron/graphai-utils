// streamMockAgent client.
// npx ts-node -r tsconfig-paths/register test/stream_client.ts

import { AgentFunctionContext } from "graphai/lib/type";

async function* streamChatCompletion(url: string, postData: AgentFunctionContext) {
  const { params, inputs, debugInfo, filterParams } = postData;
  const postBody = { params, inputs, debugInfo, filterParams };

  const completion = await fetch(url, {
    headers: {
      "Content-Type": "text/event-stream",
    },
    method: "POST",
    body: JSON.stringify(postBody),
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

const streamingRequest = async (url: string, postData: AgentFunctionContext) => {
  const generator = streamChatCompletion(url, postData);

  const messages = [];
  for await (const token of generator) {
    // callback to stream filter
    if (token) {
      messages.push(token);
      if (messages.join("").indexOf("___END___") === -1) {
        console.log(token);
      }
    }
  }

  const payload_data = messages.join("").split("___END___")[1];
  if (payload_data) {
    const data = JSON.parse(payload_data);
    console.log(data);
  }
};

const main = async () => {
  await streamingRequest("http://localhost:8085/api/agents/stream/streamMockAgent", {
    params: {
      message: "this is test",
    },
    inputs: [],
    debugInfo: {
      verbose: false,
      nodeId: "123",
      retry: 2,
    },
    filterParams: {},
  });
  await streamingRequest("http://localhost:8085/api/agents/streamMockAgent", {
    params: {
      message: "this is test",
    },
    inputs: [],
    debugInfo: {
      verbose: false,
      nodeId: "123",
      retry: 2,
    },
    filterParams: {},
  });
};

main();
