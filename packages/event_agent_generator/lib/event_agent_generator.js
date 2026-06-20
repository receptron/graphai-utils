import { agentInfoWrapper } from "graphai";
export const eventAgentGenerator = (onStart) => {
    const eventPromise = (context) => {
        const id = Math.random().toString(32).substring(2);
        return new Promise((resolved, reject) => {
            const onEnd = (data) => {
                resolved(data);
            };
            const { params, namedInputs } = context;
            const { nodeId, agentId } = context.debugInfo;
            const { type } = params;
            const data = { onEnd, id, nodeId, agentId, type, params, namedInputs, reject };
            onStart(id, data);
        });
    };
    const eventAgent = async (context) => {
        const result = await eventPromise(context);
        return result;
    };
    return {
        eventAgent: agentInfoWrapper(eventAgent),
    };
};
