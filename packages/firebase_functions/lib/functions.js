"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgentOnCall = void 0;
const stream_agent_filter_1 = require("@graphai/stream_agent_filter");
const agent_filter_utils_1 = require("@graphai/agent_filter_utils");
const https_1 = require("firebase-functions/v2/https");
const runAgentOnCall = async (request, agents, options) => {
    const { agentId, params, debugInfo, filterParams, namedInputs } = request.data ?? {};
    const { agentFilters, streamCallback, isDebug } = options ?? {};
    const agent = agents[agentId];
    if (agent === undefined) {
        throw new https_1.HttpsError("not-found", "No Agent Found");
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
    const callback = (context, token) => {
        if (token && streamCallback) {
            streamCallback(context, token);
        }
    };
    const streamAgentFilter = {
        name: "streamAgentFilter",
        agent: (0, stream_agent_filter_1.streamAgentFilterGenerator)(callback),
    };
    const _agentFilters = [streamAgentFilter, ...(agentFilters ?? [])];
    const agentFilterRunner = (0, agent_filter_utils_1.agentFilterRunnerBuilder)(_agentFilters);
    const result = await agentFilterRunner(context, agent.agent);
    return result;
};
exports.runAgentOnCall = runAgentOnCall;
