import express from "express";

import type { AgentFunctionInfoDictionary, AgentFilterInfo, AgentFunctionContext } from "graphai";
import { streamAgentFilterGenerator } from "@graphai/stream_agent_filter";
import { agentFilterRunnerBuilder } from "@graphai/agent_filter_utils";
import { ExpressAgentInfo, StreamChunkCallback, ContentCallback } from "./type";

import { DefaultEndOfStreamDelimiter } from "./type";
import { defaultContentCallback } from "./utils";

let graphaiExpressVerbose = false;

export const updateAgentVerbose = (val: boolean) => {
  graphaiExpressVerbose = val;
};

// express middleware
// return agent list
export const agentsList = (agentDictionary: AgentFunctionInfoDictionary, hostName: string = "https://example.com", urlPath: string = "/agent") => {
  return async (req: express.Request, res: express.Response) => {
    const list: ExpressAgentInfo[] = Object.keys(agentDictionary).map((agentName: keyof AgentFunctionInfoDictionary) => {
      const agent = agentDictionary[agentName];
      return {
        agentId: agentName,
        name: agent.name,
        url: hostName + urlPath + "/" + agentName,
        description: agent.description,
        category: agent.category,
        author: agent.author,
        license: agent.license,
        repository: agent.repository,
        samples: agent.samples,
        inputs: agent.inputs,
        output: agent.output,
        stream: agent.stream ?? false,
      };
    });
    res.json({ agents: list });
  };
};

// express middleware
// return agent detail info
export const agentDoc = (agentDictionary: AgentFunctionInfoDictionary, hostName: string = "https://example.com", urlPath: string = "/agent") => {
  return async (req: express.Request, res: express.Response) => {
    const { params } = req;
    const { agentId } = params;
    const agent = agentDictionary[agentId];
    if (agent === undefined) {
      res.status(404).send("Not found");
      return;
    }
    const result = {
      agentId: agentId,
      name: agent.name,
      url: hostName + urlPath + "/" + agentId,
      description: agent.description,
      category: agent.category,
      samples: agent.samples,
      author: agent.author,
      license: agent.license,
      repository: agent.repository,
    };
    res.json(result);
  };
};

const __agentDispatcher = (
  agentDictionary: AgentFunctionInfoDictionary,
  agentFilters: AgentFilterInfo[] = [],
  streamChunkCallback?: StreamChunkCallback,
  contentCallback: ContentCallback = defaultContentCallback,
  isDispatch: boolean = true,
) => {
  const nonStram = nonStreamAgentDispatcher(agentDictionary, agentFilters, isDispatch);
  const stream = streamAgentDispatcher(agentDictionary, agentFilters, isDispatch, streamChunkCallback, contentCallback);
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const isStreaming = (req.headers["content-type"] || "").startsWith("text/event-stream");
    if (graphaiExpressVerbose) {
      console.log("__agentDispatcher(isStreaming): ", isStreaming);
    }
    if (isStreaming) {
      return await stream(req, res, next);
    }
    return await nonStram(req, res, next);
  };
};

// express middleware
// dispatch and run agent
// app.post(apiPrefix + "/:agentId", agentDispatcher(agentDictionary));

export const agentDispatcher = (
  agentDictionary: AgentFunctionInfoDictionary,
  agentFilters: AgentFilterInfo[] = [],
  streamChunkCallback?: StreamChunkCallback,
  contentCallback: ContentCallback = defaultContentCallback,
) => {
  return __agentDispatcher(agentDictionary, agentFilters, streamChunkCallback, contentCallback, true);
};

// express middleware
// run agent
// app.post(agentPrefix, agentRunner(agentDictionary));

export const agentRunner = (
  agentDictionary: AgentFunctionInfoDictionary,
  agentFilters: AgentFilterInfo[] = [],
  streamChunkCallback?: StreamChunkCallback,
  contentCallback: ContentCallback = defaultContentCallback,
) => {
  return __agentDispatcher(agentDictionary, agentFilters, streamChunkCallback, contentCallback, false);
};

// express middleware
// run agent
export const nonStreamAgentDispatcher = (agentDictionary: AgentFunctionInfoDictionary, agentFilters: AgentFilterInfo[] = [], isDispatch: boolean = true) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (graphaiExpressVerbose) {
      console.log("nonStreamAgentDispatcher");
    }
    try {
      const dispatcher = agentDispatcherInternal(agentDictionary, agentFilters, isDispatch);
      const result = await dispatcher(req, res);
      return res.json(result);
    } catch (e) {
      next(e);
    }
  };
};

// express middleware
// run agent with streaming
export const streamAgentDispatcher = (
  agentDictionary: AgentFunctionInfoDictionary,
  agentFilters: AgentFilterInfo[] = [],
  isDispatch: boolean = true,
  streamChunkCallback?: StreamChunkCallback,
  contentCallback: ContentCallback = defaultContentCallback,
  endOfStreamDelimiter: string = DefaultEndOfStreamDelimiter,
) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (graphaiExpressVerbose) {
      console.log("streamAgentDispatcher");
    }
    try {
      res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");

      const callback = (context: AgentFunctionContext, token: string) => {
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
        agent: streamAgentFilterGenerator<string>(callback),
      };
      const filterList = [...agentFilters, streamAgentFilter];

      const dispatcher = agentDispatcherInternal(agentDictionary, filterList, isDispatch);
      const result = await dispatcher(req, res);

      if (endOfStreamDelimiter !== "") {
        res.write(endOfStreamDelimiter);
      }
      res.write(contentCallback(result));
      return res.end();
    } catch (e) {
      next(e);
    }
  };
};

// dispatcher internal function
const agentDispatcherInternal = (agentDictionary: AgentFunctionInfoDictionary, agentFilters: AgentFilterInfo[] = [], isDispatch: boolean = true) => {
  return async (req: express.Request, res: express.Response) => {
    if (graphaiExpressVerbose) {
      console.log("agentDispatcherInternal");
    }
    const { params } = req;
    const { agentId } = isDispatch ? params : req.body.debugInfo;

    const { params: agentParams, debugInfo, filterParams, namedInputs /* graphData */ } = req.body;
    const agent = agentDictionary[agentId];
    if (agent === undefined) {
      res.status(404).send("Not found");
      return;
    }

    const context = {
      params: agentParams || {},
      namedInputs,
      debugInfo,
      agents: agentDictionary,
      filterParams,
    };
    if (graphaiExpressVerbose) {
      const { agents: __nonLog, ...logContext } = context;
      console.log("agentDispatcherInternal(context): ", logContext);
    }
    const agentFilterRunner = agentFilterRunnerBuilder(agentFilters);
    const result = await agentFilterRunner(context, agent.agent);
    return result;
  };
};
