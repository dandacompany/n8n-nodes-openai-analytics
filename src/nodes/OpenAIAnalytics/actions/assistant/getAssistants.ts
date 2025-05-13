import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function getAssistants(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  const limit = functionThis.getNodeParameter('assistantsLimit', i, 20) as number;
  const order = functionThis.getNodeParameter('assistantsOrder', i, 'desc') as string;
  const after = functionThis.getNodeParameter('assistantsAfter', i, '') as string;
  const before = functionThis.getNodeParameter('assistantsBefore', i, '') as string;
  
  const listParams: any = {
    limit,
    order,
  };
  
  if (after) listParams.after = after;
  if (before) listParams.before = before;
  
  const assistantsResponse = await openai.beta.assistants.list(listParams);
  
  return {
    json: { assistants: assistantsResponse.data as any[] }
  };
} 