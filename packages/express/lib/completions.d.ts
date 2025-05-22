import express from "express";
import type { AgentFunctionInfoDictionary, AgentFilterInfo, TransactionLog } from "graphai";
import type { Model2GraphData } from "./type";
export declare const completionRunner: (agentDictionary: AgentFunctionInfoDictionary, model2GraphData: Model2GraphData, agentFilters?: AgentFilterInfo[], onLogCallback?: (__log: TransactionLog, __isUpdate: boolean) => void) => (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
