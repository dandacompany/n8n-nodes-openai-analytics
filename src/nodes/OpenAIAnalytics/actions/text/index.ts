import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';
import { parseJson } from './parseJson';

export async function handleTextOperation(
  operation: string, 
  context: INodeContext
): Promise<INodeExecutionData> {
  switch (operation) {
    case 'parseJson':
      return await parseJson(context);
    default:
      throw new Error(`Unsupported text operation: ${operation}`);
  }
} 
