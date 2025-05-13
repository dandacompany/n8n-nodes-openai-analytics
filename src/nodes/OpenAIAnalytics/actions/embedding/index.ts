import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function handleEmbeddingOperation(
  operation: string, 
  context: INodeContext
): Promise<INodeExecutionData> {
  switch (operation) {
    case 'create':
      // 임시 구현
      return {
        json: { 
          message: "Embedding operation 'create' not fully implemented yet",
          operation
        }
      };
    case 'embeddingBasedClassify':
      // 임시 구현
      return {
        json: { 
          message: "Embedding operation 'embeddingBasedClassify' not fully implemented yet",
          operation
        }
      };
    case 'llmBasedClassify':
      // 임시 구현
      return {
        json: { 
          message: "Embedding operation 'llmBasedClassify' not fully implemented yet",
          operation
        }
      };
    default:
      throw new Error(`Unsupported embedding operation: ${operation}`);
  }
} 