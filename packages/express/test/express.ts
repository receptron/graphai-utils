// express server example
import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express from "express";
import type { AgentFunctionInfoDictionary, TransactionLog, AgentFunction } from "graphai";
import { agentInfoWrapper } from "graphai";

import * as agents from "@graphai/agents";
import { llmGraphData, graphDictonary } from "./graph_data";

import {
  agentDispatcher,
  agentRunner,
  streamAgentDispatcher,
  nonStreamAgentDispatcher,
  agentsList,
  agentDoc,
  graphRunner,
  StreamChunkCallback,
  ContentCallback,
  updateAgentVerbose,
  completionRunner,
  modelList,
} from "@/index";

updateAgentVerbose(true);

import cors from "cors";

const configDebugAgent: AgentFunction = async ({ config }) => {
  console.log(config);
  return config ?? {};
};
const configDebugAgentInfo = agentInfoWrapper(configDebugAgent);

const agentDictionary: AgentFunctionInfoDictionary = { ...agents, configDebugAgent: configDebugAgentInfo };

const hostName = "https://example.net";
const apiPrefix = "/api/agents";
const apiGraphPrefix = "/api/graph";

export const app = express();

app.use(
  express.json({
    type(__req) {
      return true;
    },
  }),
);
app.use(cors());

const streamChunkCallback: StreamChunkCallback = (context, token) => {
  const data = {
    type: "agent",
    nodeId: context.debugInfo.nodeId,
    agentId: context.debugInfo.agentId,
    token,
  };
  return JSON.stringify(data);
};

const contentCallback: ContentCallback = (data) => {
  return JSON.stringify({
    type: "content",
    data,
  });
};

const config = {
  global: { test: "global" },
  configDebugAgent: { message: "config" },
  testDebugAgent: { message2: "config2" },
};

const onLogCallback = (log: TransactionLog, __isUpdate: boolean) => {
  console.log(log);
};

const model2graphData = (__model: string) => {
  return llmGraphData;
};

app.get(apiPrefix + "/:agentId", agentDoc(agentDictionary, hostName, apiPrefix));
app.get(apiPrefix + "/", agentsList(agentDictionary, hostName, apiPrefix));

// agent
app.post(apiPrefix + "/", agentRunner(agentDictionary));

// agent
app.post(apiPrefix + "/:agentId", agentDispatcher(agentDictionary, [], undefined, config, contentCallback));

app.post(apiPrefix + "/:agentId/stream", agentDispatcher(agentDictionary, [], streamChunkCallback));

// agent non stream
app.post(apiPrefix + "/nonstream/:agentId", nonStreamAgentDispatcher(agentDictionary, [], true, config));
// agent stream
app.post(apiPrefix + "/stream/:agentId", streamAgentDispatcher(agentDictionary, [], true, streamChunkCallback, config));

// graph
app.post(apiGraphPrefix + "/", graphRunner(agentDictionary, [], streamChunkCallback, contentCallback, ""));

app.post(apiGraphPrefix + "/stream", graphRunner(agentDictionary, [], streamChunkCallback, contentCallback, "", onLogCallback));

app.post("/api/chat/completions", completionRunner(agentDictionary, model2graphData, [], onLogCallback));
app.get("/api/models", modelList(graphDictonary));

app.use((err: any, req: express.Request, res: express.Response, __next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500);
  res.json({});
});

const port = 8085;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
