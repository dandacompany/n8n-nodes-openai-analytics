import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import OpenAI from 'openai';

export interface OpenAIApiOptions {
  apiKey: string;
  organization?: string;
  baseURL?: string;
}

export interface FileAttachment {
  file_id: string;
  tools: Array<{type: string}>;
}

export interface INodeContext {
  openai: OpenAI;
  functionThis: IExecuteFunctions;
  items: INodeExecutionData[];
  i: number;
} 