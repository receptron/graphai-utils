import { GraphAI } from "graphai";
import express from "express";
import { streamAgentFilterGenerator } from "@graphai/stream_agent_filter";

import { randomUUID } from "crypto";

import type { AgentFunctionInfoDictionary, AgentFilterInfo, TransactionLog } from "graphai";
import type { ConfigDataDictionary } from "graphai/lib/type";
import type { StreamCompletionChunkCallback, StreamChunkCallback, Model2GraphData } from "./type";

// TODO choise graph(done)
// stream flag(done);
// non stream api(done);

const streamCompletionChunkCallback: StreamCompletionChunkCallback = (data, status, token) => {
  if (status === "done") {
    return "data: [DONE]\n\n";
  }
  const payload = (() => {
    if (status === "start") {
      return {
        object: "chat.completion.chunk",
        choices: [{ index: 0, delta: { role: "assistant", content: "" }, logprobs: null, finish_reason: null }],
      };
    }
    if (status === "end") {
      return {
        object: "chat.completion.chunk",
        choices: [{ index: 0, delta: {}, logprobs: null, finish_reason: "stop" }],
      };
    }
    return {
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: { content: token }, logprobs: null, finish_reason: null }],
    };
  })();
  return "data: " + JSON.stringify({ ...data, ...payload }) + "\n\n";
};

export const completionRunner = (
  agentDictionary: AgentFunctionInfoDictionary,
  model2GraphData: Model2GraphData,
  agentFilters: AgentFilterInfo[] = [],
  onLogCallback = (__log: TransactionLog, __isUpdate: boolean) => {},
) => {
  const streamRunner = streamGraphRunner(agentDictionary, model2GraphData, agentFilters, onLogCallback);
  const nonStreamRunner = nonStreamGraphRunner(agentDictionary, model2GraphData, agentFilters, onLogCallback);

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { stream, model, messages } = req.body;

    // validation
    if (!model || typeof model !== "string") {
      return res.status(400).json({
        error: {
          message: "`model` is required and must be a string",
          type: "invalid_request_error",
          param: "model",
          code: "invalid_model",
        },
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: "`messages` must be an array of objects with `role` and `content` as strings",
          type: "invalid_request_error",
          param: "messages",
          code: "invalid_messages",
        },
      });
    }

    // const isStreaming = (req.headers["content-type"] || "").startsWith("text/event-stream")
    if (stream) {
      return await streamRunner(req, res, next);
    }
    return await nonStreamRunner(req, res, next);
  };
};

const streamGraphRunner = (
  agentDictionary: AgentFunctionInfoDictionary,
  model2GraphData: Model2GraphData,
  agentFilters: AgentFilterInfo[] = [],
  onLogCallback = (__log: TransactionLog, __isUpdate: boolean) => {},
) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { model } = req.body;

    try {
      res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");

      const baseData = {
        id: randomUUID(),
        created: Math.floor(Date.now() / 1000),
        model,
      };

      const streamCallback: StreamChunkCallback = (context, token) => {
        if (token) {
          res.write(streamCompletionChunkCallback(baseData, "payload", token));
        }
      };
      const streamAgentFilter = {
        name: "streamAgentFilter",
        agent: streamAgentFilterGenerator<string>(streamCallback),
      };
      const filterList = [...agentFilters, streamAgentFilter];

      res.write(streamCompletionChunkCallback(baseData, "start"));

      try {
        const dispatcher = streamGraphRunnerInternal(agentDictionary, model2GraphData, filterList, onLogCallback);
        await dispatcher(req);

        res.write(streamCompletionChunkCallback(baseData, "end"));
        res.write(streamCompletionChunkCallback(baseData, "done"));
      } catch (__err) {
        res.write(`data: ${JSON.stringify({ error: "GraphAI Something went wrong" })}\n\n`);
      }
      return res.end();
    } catch (e) {
      next(e);
    }
  };
};

const nonStreamGraphRunner = (
  agentDictionary: AgentFunctionInfoDictionary,
  model2GraphData: Model2GraphData,
  agentFilters: AgentFilterInfo[] = [],
  onLogCallback = (__log: TransactionLog, __isUpdate: boolean) => {},
) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const dispatcher = streamGraphRunnerInternal(agentDictionary, model2GraphData, agentFilters, onLogCallback);
      const result = await dispatcher(req);
      return res.json(result);
    } catch (e) {
      next(e);
    }
  };
};

// internal function
const streamGraphRunnerInternal = (
  agentDictionary: AgentFunctionInfoDictionary,
  model2GraphData: Model2GraphData,
  agentFilters: AgentFilterInfo[] = [],
  onLogCallback = (__log: TransactionLog, __isUpdate: boolean) => {},
) => {
  return async (req: express.Request & { config?: ConfigDataDictionary }) => {
    const { messages, model } = req.body;
    const { config } = req;

    const graphData = model2GraphData(model);
    const graphai = new GraphAI(graphData, agentDictionary, { agentFilters, config: config ?? {} });
    // injectValue
    graphai.injectValue("messages", messages);
    graphai.onLogCallback = onLogCallback;
    const result = await graphai.run();
    return result;
  };
};
