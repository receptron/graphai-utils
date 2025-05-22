"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completionRunner = void 0;
const graphai_1 = require("graphai");
const stream_agent_filter_1 = require("@graphai/stream_agent_filter");
const crypto_1 = require("crypto");
// TODO choise graph(done)
// stream flag(done);
// non stream api(done);
const streamCompletionChunkCallback = (data, status, token) => {
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
const completionRunner = (agentDictionary, model2GraphData, agentFilters = [], onLogCallback = (__log, __isUpdate) => { }) => {
    const streamRunner = streamGraphRunner(agentDictionary, model2GraphData, agentFilters, onLogCallback);
    const nonStreamRunner = nonStreamGraphRunner(agentDictionary, model2GraphData, agentFilters, onLogCallback);
    return async (req, res, next) => {
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
exports.completionRunner = completionRunner;
const streamGraphRunner = (agentDictionary, model2GraphData, agentFilters = [], onLogCallback = (__log, __isUpdate) => { }) => {
    return async (req, res, next) => {
        const { model } = req.body;
        try {
            res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("X-Accel-Buffering", "no");
            const baseData = {
                id: (0, crypto_1.randomUUID)(),
                created: Math.floor(Date.now() / 1000),
                model,
            };
            const streamCallback = (context, token) => {
                if (token) {
                    res.write(streamCompletionChunkCallback(baseData, "payload", token));
                }
            };
            const streamAgentFilter = {
                name: "streamAgentFilter",
                agent: (0, stream_agent_filter_1.streamAgentFilterGenerator)(streamCallback),
            };
            const filterList = [...agentFilters, streamAgentFilter];
            res.write(streamCompletionChunkCallback(baseData, "start"));
            try {
                const dispatcher = streamGraphRunnerInternal(agentDictionary, model2GraphData, filterList, onLogCallback);
                await dispatcher(req);
                res.write(streamCompletionChunkCallback(baseData, "end"));
                res.write(streamCompletionChunkCallback(baseData, "done"));
            }
            catch (__err) {
                res.write(`data: ${JSON.stringify({ error: "GraphAI Something went wrong" })}\n\n`);
            }
            return res.end();
        }
        catch (e) {
            next(e);
        }
    };
};
const nonStreamGraphRunner = (agentDictionary, model2GraphData, agentFilters = [], onLogCallback = (__log, __isUpdate) => { }) => {
    return async (req, res, next) => {
        try {
            const dispatcher = streamGraphRunnerInternal(agentDictionary, model2GraphData, agentFilters, onLogCallback);
            const result = await dispatcher(req);
            return res.json(result);
        }
        catch (e) {
            next(e);
        }
    };
};
// internal function
const streamGraphRunnerInternal = (agentDictionary, model2GraphData, agentFilters = [], onLogCallback = (__log, __isUpdate) => { }) => {
    return async (req) => {
        const { messages, model } = req.body;
        const { config } = req;
        const graphData = model2GraphData(model);
        const graphai = new graphai_1.GraphAI(graphData, agentDictionary, { agentFilters, config: config ?? {} });
        // injectValue
        graphai.injectValue("messages", messages);
        graphai.onLogCallback = onLogCallback;
        const result = await graphai.run();
        return result;
    };
};
