import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function getAssistant(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  const assistantId = functionThis.getNodeParameter('assistantIdToGet', i) as string;
  
  const assistant = await openai.beta.assistants.retrieve(assistantId);
  
  return {
    json: { ...assistant as any }
  };
} 