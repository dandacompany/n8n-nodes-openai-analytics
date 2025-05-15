import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';
import { createEmbedding } from './createEmbedding';
import { embeddingBasedClassify } from './embeddingBasedClassify';
import { llmBasedClassify } from './llmBasedClassify';
import { computeCosineSimilarity } from './cosineSimilarity';

export async function handleEmbeddingOperation(
  operation: string, 
  context: INodeContext
): Promise<INodeExecutionData> {
  switch (operation) {
    case 'create':
      return await createEmbedding(context);
    case 'embeddingBasedClassify':
      return await embeddingBasedClassify(context);
    case 'llmBasedClassify':
      return await llmBasedClassify(context);
    case 'cosineSimilarity':
      return await computeCosineSimilarity(context);
    default:
      throw new Error(`Unsupported embedding operation: ${operation}`);
  }
} 
