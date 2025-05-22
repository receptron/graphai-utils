import { GraphAI } from "graphai";
import express from "express";
import { streamAgentFilterGenerator } from "@graphai/stream_agent_filter";

import { DefaultEndOfStreamDelimiter } from "./type";
import { defaultContentCallback } from "./utils";

import type { AgentFunctionInfoDictionary, AgentFilterInfo, TransactionLog } from "graphai";
import type { ConfigDataDictionary } from "graphai/lib/type";
import type { StreamChunkCallback, ContentCallback } from "./type";

export const graphRunner = (
  agentDictionary: AgentFunctionInfoDictionary,
  agentFilters: AgentFilterInfo[] = [],
  streamChunkCallback?: StreamChunkCallback,
  contentCallback: ContentCallback = defaultContentCallback,
  endOfStreamDelimiter: string = DefaultEndOfStreamDelimiter,
  onLogCallback = (__log: TransactionLog, __isUpdate: boolean) => {},
) => {
  const stream = streamGraphRunner(agentDictionary, agentFilters, streamChunkCallback, contentCallback, endOfStreamDelimiter, onLogCallback);
  const nonStream = nonStreamGraphRunner(agentDictionary, agentFilters, onLogCallback);

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const isStreaming = (req.headers["content-type"] || "").startsWith("text/event-stream");
    if (isStreaming) {
      return await stream(req, res, next);
    }
    return await nonStream(req, res, next);
  };
};

export const streamGraphRunner = (
  agentDictionary: AgentFunctionInfoDictionary,
  agentFilters: AgentFilterInfo[] = [],
  streamChunkCallback?: StreamChunkCallback,
  contentCallback: ContentCallback = defaultContentCallback,
  endOfStreamDelimiter: string = DefaultEndOfStreamDelimiter,
  onLogCallback = (__log: TransactionLog, __isUpdate: boolean) => {},
) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");

      const streamCallback: StreamChunkCallback = (context, token) => {
        if (token) {
          if (streamChunkCallback) {
            res.write(streamChunkCallback(context, token));
          } else {
            res.write(token);
          }
        }
      };
      const streamAgentFilter = {
        name: "streamAgentFilter",
        agent: streamAgentFilterGenerator<string>(streamCallback),
      };
      const filterList = [...agentFilters, streamAgentFilter];

      const dispatcher = streamGraphRunnerInternal(agentDictionary, filterList, onLogCallback);
      const result = await dispatcher(req);

      if (endOfStreamDelimiter !== "") {
        res.write(endOfStreamDelimiter);
      }
      res.write(contentCallback(result));
      res.end();
    } catch (e) {
      next(e);
    }
  };
};

export const nonStreamGraphRunner = (
  agentDictionary: AgentFunctionInfoDictionary,
  agentFilters: AgentFilterInfo[] = [],
  onLogCallback = (__log: TransactionLog, __isUpdate: boolean) => {},
) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const dispatcher = streamGraphRunnerInternal(agentDictionary, agentFilters, onLogCallback);
      const result = await dispatcher(req);
      res.json(result);
    } catch (e) {
      next(e);
    }
  };
};

// internal function
const streamGraphRunnerInternal = (
  agentDictionary: AgentFunctionInfoDictionary,
  agentFilters: AgentFilterInfo[] = [],
  onLogCallback = (__log: TransactionLog, __isUpdate: boolean) => {},
) => {
  return async (req: express.Request & { config?: ConfigDataDictionary }) => {
    const { graphData } = req.body;
    const { config } = req;

    const graphai = new GraphAI(graphData, agentDictionary, { agentFilters, config: config ?? {} });
    graphai.onLogCallback = onLogCallback;
    const result = await graphai.run();
    return result;
  };
};
