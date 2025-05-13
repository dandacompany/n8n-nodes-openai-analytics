import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';
import { getAssistants } from './getAssistants';
import { createAssistant } from './createAssistant';

export async function handleAssistantOperation(
  operation: string, 
  context: INodeContext
): Promise<INodeExecutionData> {
  switch (operation) {
    case 'getAssistants':
      return await getAssistants(context);
    case 'createAssistant':
      return await createAssistant(context);
    default:
      throw new Error(`Unsupported assistant operation: ${operation}`);
  }
} 