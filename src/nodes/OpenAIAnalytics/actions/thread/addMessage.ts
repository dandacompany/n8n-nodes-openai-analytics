import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function addMessage(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  const threadId = functionThis.getNodeParameter('threadId', i) as string;
  const messageRole = functionThis.getNodeParameter('messageRole', i) as 'user';
  const messageContent = functionThis.getNodeParameter('messageContent', i) as string;
  const fileIdsString = functionThis.getNodeParameter('fileIds', i, '') as string;
  
  // 파일 IDs 처리
  const fileIds = fileIdsString ? fileIdsString.split(',').map(id => id.trim()) : [];
  
  // Add message to thread - 타입 단언을 사용하여 file_ids 처리
  const messageParams: any = {
    role: messageRole,
    content: messageContent,
  };
  
  // file_ids가 있는 경우에만 attachments 추가
  if (fileIds.length > 0) {
    // V2 API에서는 file_ids 대신 attachments를 사용
    messageParams.attachments = fileIds.map(fileId => ({
      file_id: fileId,
      tools: [{ type: 'code_interpreter' }]
    }));
  }
  
  // 타입 단언을 사용하여 API 호출
  const message = await openai.beta.threads.messages.create(threadId, messageParams);
  
  return {
    json: { ...message as any }
  };
} 