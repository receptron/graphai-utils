import { agentInfoWrapper } from "graphai";
export const textInputAgentGenerator = (inputEvents) => {
    const submit = (id, value, success) => {
        if (inputEvents.length > 0) {
            const index = inputEvents.findIndex((inp) => inp.id === id);
            if (index > -1) {
                inputEvents[index].task(value);
                inputEvents.splice(index, 1);
                if (success) {
                    success();
                }
            }
        }
    };
    const textPromise = (context) => {
        const id = Math.random().toString(32).substring(2);
        return new Promise((resolved) => {
            const task = (message) => {
                resolved(message);
            };
            const { params } = context;
            const { nodeId, agentId } = context.debugInfo;
            inputEvents.push({ task, id, nodeId, agentId, params });
        });
    };
    const textInputAgent = async (context) => {
        const result = await textPromise(context);
        return {
            text: result,
            message: { role: "user", content: result },
        };
    };
    return {
        textInputAgent: agentInfoWrapper(textInputAgent),
        submit,
    };
};
