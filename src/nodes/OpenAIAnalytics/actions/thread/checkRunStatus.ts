import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function checkRunStatus(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  const threadId = functionThis.getNodeParameter('threadId', i) as string;
  const runId = functionThis.getNodeParameter('runId', i) as string;
  
  const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
  
  return {
    json: { ...runStatus as any }
  };
} 