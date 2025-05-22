import type { AgentFunctionInfoSample, AgentFunctionContext, GraphData } from "graphai";
export type ExpressAgentInfo = {
    agentId: string;
    name: string;
    url: string;
    description: string;
    category: string[];
    author: string;
    license: string;
    repository: string;
    samples: AgentFunctionInfoSample[];
    inputs: any;
    output: any;
    stream: boolean;
};
type BaseData = {
    id: string;
    created: number;
    model: string;
};
export type StreamChunkCallback = <T = string | Record<string, string>>(context: AgentFunctionContext, token: T) => void;
export type StreamCompletionChunkCallback = <T = string | Record<string, string>>(data: BaseData, status: string, token?: T) => void;
export type Model2GraphData = (model: string) => GraphData;
export type GraphDictionary = Record<string, GraphData>;
export type ContentCallback = <T = string | Record<string, string>>(token: T) => void;
export declare const DefaultEndOfStreamDelimiter = "___END___";
export {};
