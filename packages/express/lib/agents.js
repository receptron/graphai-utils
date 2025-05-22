"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamAgentDispatcher = exports.nonStreamAgentDispatcher = exports.agentRunner = exports.agentDispatcher = exports.agentDoc = exports.agentsList = exports.updateAgentVerbose = void 0;
const stream_agent_filter_1 = require("@graphai/stream_agent_filter");
const agent_filter_utils_1 = require("@graphai/agent_filter_utils");
const type_1 = require("./type");
const utils_1 = require("./utils");
let graphaiExpressVerbose = false;
const updateAgentVerbose = (val) => {
    graphaiExpressVerbose = val;
};
exports.updateAgentVerbose = updateAgentVerbose;
// express middleware
// return agent list
const agentsList = (agentDictionary, hostName = "https://example.com", urlPath = "/agent") => {
    return async (req, res) => {
        const list = Object.keys(agentDictionary).map((agentName) => {
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
exports.agentsList = agentsList;
// express middleware
// return agent detail info
const agentDoc = (agentDictionary, hostName = "https://example.com", urlPath = "/agent") => {
    return async (req, res) => {
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
exports.agentDoc = agentDoc;
const __agentDispatcher = (agentDictionary, agentFilters = [], streamChunkCallback, contentCallback = utils_1.defaultContentCallback, isDispatch = true) => {
    const nonStram = (0, exports.nonStreamAgentDispatcher)(agentDictionary, agentFilters, isDispatch);
    const stream = (0, exports.streamAgentDispatcher)(agentDictionary, agentFilters, isDispatch, streamChunkCallback, contentCallback);
    return async (req, res, next) => {
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
const agentDispatcher = (agentDictionary, agentFilters = [], streamChunkCallback, contentCallback = utils_1.defaultContentCallback) => {
    return __agentDispatcher(agentDictionary, agentFilters, streamChunkCallback, contentCallback, true);
};
exports.agentDispatcher = agentDispatcher;
// express middleware
// run agent
// app.post(agentPrefix, agentRunner(agentDictionary));
const agentRunner = (agentDictionary, agentFilters = [], streamChunkCallback, contentCallback = utils_1.defaultContentCallback) => {
    return __agentDispatcher(agentDictionary, agentFilters, streamChunkCallback, contentCallback, false);
};
exports.agentRunner = agentRunner;
// express middleware
// run agent
const nonStreamAgentDispatcher = (agentDictionary, agentFilters = [], isDispatch = true) => {
    return async (req, res, next) => {
        if (graphaiExpressVerbose) {
            console.log("nonStreamAgentDispatcher");
        }
        try {
            const dispatcher = agentDispatcherInternal(agentDictionary, agentFilters, isDispatch);
            const result = await dispatcher(req, res);
            return res.json(result);
        }
        catch (e) {
            next(e);
        }
    };
};
exports.nonStreamAgentDispatcher = nonStreamAgentDispatcher;
// express middleware
// run agent with streaming
const streamAgentDispatcher = (agentDictionary, agentFilters = [], isDispatch = true, streamChunkCallback, contentCallback = utils_1.defaultContentCallback, endOfStreamDelimiter = type_1.DefaultEndOfStreamDelimiter) => {
    return async (req, res, next) => {
        if (graphaiExpressVerbose) {
            console.log("streamAgentDispatcher");
        }
        try {
            res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("X-Accel-Buffering", "no");
            const callback = (context, token) => {
                if (token) {
                    if (streamChunkCallback) {
                        res.write(streamChunkCallback(context, token));
                    }
                    else {
                        res.write(token);
                    }
                }
            };
            const streamAgentFilter = {
                name: "streamAgentFilter",
                agent: (0, stream_agent_filter_1.streamAgentFilterGenerator)(callback),
            };
            const filterList = [...agentFilters, streamAgentFilter];
            const dispatcher = agentDispatcherInternal(agentDictionary, filterList, isDispatch);
            const result = await dispatcher(req, res);
            if (endOfStreamDelimiter !== "") {
                res.write(endOfStreamDelimiter);
            }
            res.write(contentCallback(result));
            return res.end();
        }
        catch (e) {
            next(e);
        }
    };
};
exports.streamAgentDispatcher = streamAgentDispatcher;
// dispatcher internal function
const agentDispatcherInternal = (agentDictionary, agentFilters = [], isDispatch = true) => {
    return async (req, res) => {
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
        const agentFilterRunner = (0, agent_filter_utils_1.agentFilterRunnerBuilder)(agentFilters);
        const result = await agentFilterRunner(context, agent.agent);
        return result;
    };
};
