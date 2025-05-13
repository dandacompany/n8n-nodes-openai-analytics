import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function listMessages(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  const threadId = functionThis.getNodeParameter('threadId', i) as string;
  const limit = functionThis.getNodeParameter('limit', i, 20) as number;
  const simplify = functionThis.getNodeParameter('simplify', i, true) as boolean;
  
  const messagesResponse = await openai.beta.threads.messages.list(threadId, {
    limit,
  });
  
  let responseData;
  
  if (simplify) {
    // 타입 캐스팅을 통한 타입 오류 해결
    const messagesData = messagesResponse.data as any[];
    responseData = messagesData.map((message) => {
      // 타입 캐스팅을 통한 타입 오류 해결
      const messageContent = message.content as any[];
      const simplifiedContent = messageContent.map((content) => {
        if (content.type === 'text') {
          return { type: 'text', text: content.text.value };
        }
        return content;
      });
      
      return {
        id: message.id,
        role: message.role,
        content: simplifiedContent,
        created_at: message.created_at,
      };
    });
  } else {
    responseData = messagesResponse.data;
  }
  
  return {
    json: { ...responseData as any }
  };
} 