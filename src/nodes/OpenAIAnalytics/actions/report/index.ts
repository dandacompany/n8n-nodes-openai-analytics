import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function handleReportOperation(
  operation: string, 
  context: INodeContext
): Promise<INodeExecutionData> {
  return {
    json: {
      message: `Report operation '${operation}' is not implemented yet.`
    }
  };
}
