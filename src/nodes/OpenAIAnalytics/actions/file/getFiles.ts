import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function getFiles(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  const limit = functionThis.getNodeParameter('filesLimit', i, 20) as number;
  const order = functionThis.getNodeParameter('filesOrder', i, 'desc') as string;
  const purpose = functionThis.getNodeParameter('purpose', i, '') as string;
  const after = functionThis.getNodeParameter('filesAfter', i, '') as string;
  const before = functionThis.getNodeParameter('filesBefore', i, '') as string;
  
  const listParams: any = {
    limit,
    order,
  };
  
  if (purpose) listParams.purpose = purpose;
  if (after) listParams.after = after;
  if (before) listParams.before = before;
  
  const filesResponse = await openai.files.list(listParams);
  
  return {
    json: { files: filesResponse.data as any[] }
  };
} 