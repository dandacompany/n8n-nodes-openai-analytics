import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';
import { getAssistants } from './getAssistants';
import { getAssistant } from './getAssistant';

export async function handleAssistantOperation(
  operation: string, 
  context: INodeContext
): Promise<INodeExecutionData> {
  switch (operation) {
    case 'getAssistants':
      return await getAssistants(context);
    case 'getAssistant':
      return await getAssistant(context);
    default:
      throw new Error(`Unsupported assistant operation: ${operation}`);
  }
} 