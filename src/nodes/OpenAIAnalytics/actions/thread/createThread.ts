import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function createThread(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  const initialMessage = functionThis.getNodeParameter('initialMessage', i, '') as string;
  
  // Create thread
  const thread = await openai.beta.threads.create();
  
  // Add initial message if provided
  if (initialMessage) {
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: initialMessage,
    });
  }
  
  return {
    json: { ...thread as any }
  };
} 