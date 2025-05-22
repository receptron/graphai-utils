import { streamAgentFilterGenerator } from "@graphai/stream_agent_filter";
import { agentFilterRunnerBuilder } from "@graphai/agent_filter_utils";

import { HttpsError } from "firebase-functions/v2/https";

import type { CallableRequest } from "firebase-functions/v2/https";
import type { AgentFunctionContext, AgentFunctionInfoDictionary, AgentFilterInfo } from "graphai";

export type StreamChunkCallback = (context: AgentFunctionContext, token: string) => void;

export const runAgentOnCall = async (
  request: CallableRequest,
  agents: AgentFunctionInfoDictionary,
  options?: {
    agentFilters?: AgentFilterInfo[];
    streamCallback?: StreamChunkCallback;
    isDebug?: boolean;
  },
) => {
  const { agentId, params, debugInfo, filterParams, namedInputs } = request.data ?? {};
  const { agentFilters, streamCallback, isDebug } = options ?? {};

  const agent = agents[agentId];
  if (agent === undefined) {
    throw new HttpsError("not-found", "No Agent Found");
  }

  const context = {
    params: params ?? {},
    namedInputs,
    debugInfo,
    agents,
    filterParams,
  };

  if (isDebug) {
    const { agents: __nonLog, ...logContext } = context;
    console.log("functionsAgentOnCall(context): ", logContext);
  }

  const callback = (context: AgentFunctionContext, token: string) => {
    if (token && streamCallback) {
      streamCallback(context, token);
    }
  };
  const streamAgentFilter = {
    name: "streamAgentFilter",
    agent: streamAgentFilterGenerator<string>(callback),
  };
  const _agentFilters = [streamAgentFilter, ...(agentFilters ?? [])];

  const agentFilterRunner = agentFilterRunnerBuilder(_agentFilters);
  const result = await agentFilterRunner(context, agent.agent);
  return result;
};
