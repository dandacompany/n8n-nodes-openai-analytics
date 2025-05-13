import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function getThread(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  const threadId = functionThis.getNodeParameter('threadId', i) as string;
  
  const thread = await openai.beta.threads.retrieve(threadId);
  
  return {
    json: { ...thread as any }
  };
} 