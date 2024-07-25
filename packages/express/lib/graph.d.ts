import express from "express";
import type { AgentFunctionInfoDictionary, AgentFilterInfo } from "graphai";
import { StreamChunkCallback } from "./type";
export declare const graphRunner: (agentDictionary: AgentFunctionInfoDictionary, agentFilters?: AgentFilterInfo[], streamChunkCallback?: StreamChunkCallback) => (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<express.Response<any, Record<string, any>> | undefined>;
export declare const streamGraphRunner: (agentDictionary: AgentFunctionInfoDictionary, agentFilters?: AgentFilterInfo[], streamChunkCallback?: StreamChunkCallback) => (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<express.Response<any, Record<string, any>> | undefined>;
export declare const nonStreamGraphRunner: (agentDictionary: AgentFunctionInfoDictionary, agentFilters?: AgentFilterInfo[]) => (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<express.Response<any, Record<string, any>> | undefined>;
