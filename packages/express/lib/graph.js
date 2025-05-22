"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nonStreamGraphRunner = exports.streamGraphRunner = exports.graphRunner = void 0;
const graphai_1 = require("graphai");
const stream_agent_filter_1 = require("@graphai/stream_agent_filter");
const type_1 = require("./type");
const utils_1 = require("./utils");
const graphRunner = (agentDictionary, agentFilters = [], streamChunkCallback, contentCallback = utils_1.defaultContentCallback, endOfStreamDelimiter = type_1.DefaultEndOfStreamDelimiter, onLogCallback = (__log, __isUpdate) => { }) => {
    const stream = (0, exports.streamGraphRunner)(agentDictionary, agentFilters, streamChunkCallback, contentCallback, endOfStreamDelimiter, onLogCallback);
    const nonStream = (0, exports.nonStreamGraphRunner)(agentDictionary, agentFilters, onLogCallback);
    return async (req, res, next) => {
        const isStreaming = (req.headers["content-type"] || "").startsWith("text/event-stream");
        if (isStreaming) {
            return await stream(req, res, next);
        }
        return await nonStream(req, res, next);
    };
};
exports.graphRunner = graphRunner;
const streamGraphRunner = (agentDictionary, agentFilters = [], streamChunkCallback, contentCallback = utils_1.defaultContentCallback, endOfStreamDelimiter = type_1.DefaultEndOfStreamDelimiter, onLogCallback = (__log, __isUpdate) => { }) => {
    return async (req, res, next) => {
        try {
            res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("X-Accel-Buffering", "no");
            const streamCallback = (context, token) => {
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
                agent: (0, stream_agent_filter_1.streamAgentFilterGenerator)(streamCallback),
            };
            const filterList = [...agentFilters, streamAgentFilter];
            const dispatcher = streamGraphRunnerInternal(agentDictionary, filterList, onLogCallback);
            const result = await dispatcher(req);
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
exports.streamGraphRunner = streamGraphRunner;
const nonStreamGraphRunner = (agentDictionary, agentFilters = [], onLogCallback = (__log, __isUpdate) => { }) => {
    return async (req, res, next) => {
        try {
            const dispatcher = streamGraphRunnerInternal(agentDictionary, agentFilters, onLogCallback);
            const result = await dispatcher(req);
            return res.json(result);
        }
        catch (e) {
            next(e);
        }
    };
};
exports.nonStreamGraphRunner = nonStreamGraphRunner;
// internal function
const streamGraphRunnerInternal = (agentDictionary, agentFilters = [], onLogCallback = (__log, __isUpdate) => { }) => {
    return async (req) => {
        const { graphData } = req.body;
        const { config } = req;
        const graphai = new graphai_1.GraphAI(graphData, agentDictionary, { agentFilters, config: config ?? {} });
        graphai.onLogCallback = onLogCallback;
        const result = await graphai.run();
        return result;
    };
};
