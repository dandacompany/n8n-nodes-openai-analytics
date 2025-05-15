import { INodeExecutionData } from 'n8n-workflow';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { INodeContext, FileAttachment } from '../../types';

export async function createAndRunThread(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, items, i } = context;
  
  const messageInputMethod = functionThis.getNodeParameter('threadMessageInputMethod', i, 'singleMessage') as string;
  const fileAttachmentMethod = functionThis.getNodeParameter('threadFileAttachmentMethod', i) as string;
  
  // 파일 첨부 준비
  const fileAttachments: FileAttachment[] = [];
  
  // 바이너리 파일 업로드 처리
  if (fileAttachmentMethod === 'uploadFiles' || fileAttachmentMethod === 'both') {
    const binaryPropertyName = functionThis.getNodeParameter('threadBinaryPropertyName', i) as string;
    const uploadFilePurpose = functionThis.getNodeParameter('threadUploadFilePurpose', i) as string;
    
    // 모든 바이너리 속성을 찾아 업로드
    const item = items[i];
    const binaryProperties: string[] = [];
    
    // 기본 바이너리 속성 확인
    if (item.binary?.[binaryPropertyName]) {
      binaryProperties.push(binaryPropertyName);
    }
    
    // data_1, data_2 등의 형식으로 추가 바이너리 속성 확인
    let propertyIndex = 1;
    while (item.binary?.[`${binaryPropertyName}_${propertyIndex}`]) {
      binaryProperties.push(`${binaryPropertyName}_${propertyIndex}`);
      propertyIndex++;
    }
    
    // 파일 업로드 및 첨부
    for (const propertyName of binaryProperties) {
      const binaryData = item.binary![propertyName];
      const buffer = Buffer.from(binaryData.data, 'base64');
      
      // 임시 파일로 저장
      const tmpDir = os.tmpdir();
      const fileName = binaryData.fileName || `upload_${Date.now()}.${binaryData.fileExtension || 'dat'}`;
      const filePath = path.join(tmpDir, fileName);
      
      try {
        // 바이너리 데이터를 임시 파일로 저장
        fs.writeFileSync(filePath, buffer);
        
        // OpenAI API에 업로드 - ReadStream 사용
        const fileStream = fs.createReadStream(filePath);
        
        // 타입 문제 해결을 위한 업로드 파라미터 생성
        const uploadParams: any = {
          file: fileStream,
          purpose: uploadFilePurpose === 'assistants_input' ? 'assistants_input' : 'assistants',
        };
        
        const fileUploadResult = await openai.files.create(uploadParams);
        
        // 업로드된 파일을 첨부 목록에 추가
        fileAttachments.push({
          file_id: fileUploadResult.id,
          tools: [{ type: 'code_interpreter' }]
        });
        
        // 임시 파일 삭제
        fs.unlinkSync(filePath);
      } catch (error) {
        // 에러 발생 시 임시 파일 삭제 시도
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          // 정리 중 오류는 무시
        }
        throw error;
      }
    }
  }
  
  // 기존 파일 ID 처리
  if ((fileAttachmentMethod === 'existingFiles' || fileAttachmentMethod === 'both') && 
    functionThis.getNodeParameter('threadFileIdsEnabled', i, false) as boolean) {
    const existingFileIds = functionThis.getNodeParameter('threadFileIds', i, []) as string[];
    
    // 기존 파일 ID를 첨부 목록에 추가
    for (const fileId of existingFileIds) {
      fileAttachments.push({
        file_id: fileId,
        tools: [{ type: 'code_interpreter' }]
      });
    }
  }
  
  // Assistant ID 설정
  const assistantSelection = functionThis.getNodeParameter('threadAssistantSelection', i, 'fromList') as string;
  let assistantId = '';
  
  if (assistantSelection === 'byId') {
    assistantId = functionThis.getNodeParameter('threadAssistantId', i) as string;
  } else {
    assistantId = functionThis.getNodeParameter('threadAssistantId', i) as string;
  }
  
  // 실행 관련 매개변수
  const waitForCompletion = functionThis.getNodeParameter('threadWaitForCompletion', i) as boolean;
  const maxPollTime = functionThis.getNodeParameter('threadMaxPollTime', i, 120) as number;
  const instructions = functionThis.getNodeParameter('threadInstructions', i, '') as string;
  const simplifyOutput = functionThis.getNodeParameter('threadSimplifyOutput', i, true) as boolean;
  
  // Thread 생성을 위한 메시지 배열
  const threadMessages: any[] = [];
  
  if (messageInputMethod === 'singleMessage') {
    // 단일 메시지 처리
    const initialMessage = functionThis.getNodeParameter('threadInitialMessage', i) as string;
    
    const messageParams: any = {
      role: 'user',
      content: initialMessage,
    };
    
    // 파일 첨부가 있는 경우 추가
    if (fileAttachments.length > 0) {
      messageParams.attachments = fileAttachments;
    }
    
    threadMessages.push(messageParams);
  } else {
    // 여러 메시지 처리
    const messagesCollection = functionThis.getNodeParameter('threadMessages', i) as {
      values: Array<{
        role: 'user' | 'system';
        content: string;
      }>;
    };
    
    if (messagesCollection?.values?.length) {
      // 모든 메시지를 추가
      for (const msg of messagesCollection.values) {
        const messageParams: any = {
          role: msg.role,
          content: msg.content,
        };
        
        // 파일 첨부는 첫 번째 메시지에만 추가 (OpenAI 제한사항)
        if (fileAttachments.length > 0 && threadMessages.length === 0) {
          messageParams.attachments = fileAttachments;
        }
        
        threadMessages.push(messageParams);
      }
    } else {
      // 메시지가 없는 경우 빈 사용자 메시지 추가
      const messageParams: any = {
        role: 'user',
        content: '',
      };
      
      // 파일 첨부가 있는 경우 추가
      if (fileAttachments.length > 0) {
        messageParams.attachments = fileAttachments;
      }
      
      threadMessages.push(messageParams);
    }
  }
  
  // 메시지로 Thread 생성
  const threadParams: any = {
    messages: threadMessages
  };
  
  const thread = await openai.beta.threads.create(threadParams);
  
  // 실행 매개변수 설정
  const runParams: any = {
    assistant_id: assistantId
  };
  if (instructions) runParams.instructions = instructions;
  
  // Thread 실행
  const run = await openai.beta.threads.runs.create(thread.id, runParams);
  
  if (!waitForCompletion) {
    return {
      json: { thread: { ...thread as any }, run: { ...run as any } }
    };
  } else {
    // 완료까지 대기
    const maxEndTime = Date.now() + maxPollTime * 1000;
    
    let runStatus = run;
    while (
      ['in_progress', 'queued', 'requires_action'].includes(runStatus.status) && 
      Date.now() < maxEndTime
    ) {
      // 각 확인 사이 1초 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }
    
    let responseData: any;
    
    if (simplifyOutput) {
      responseData = {
        thread_id: thread.id,
        run_id: run.id,
        status: runStatus.status,
        created_at: new Date(runStatus.created_at * 1000).toISOString(),
        completed_at: runStatus.completed_at ? new Date(runStatus.completed_at * 1000).toISOString() : null,
      };
    } else {
      responseData = { thread: { ...thread as any }, run: { ...runStatus as any } };
    }
    
    // 완료된 경우 메시지 가져오기
    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);
      
      if (simplifyOutput) {
        // 간소화된 메시지 형식
        const simplifiedMessages = messages.data.map(message => {
          const content = message.content.map(content => {
            if (content.type === 'text') {
              return { 
                type: 'text', 
                text: content.text.value 
              };
            }
            return content;
          });
          
          return {
            id: message.id,
            role: message.role,
            content,
            created_at: new Date(message.created_at * 1000).toISOString(),
          };
        });
        
        responseData.messages = simplifiedMessages;
      } else {
        responseData.messages = messages.data;
      }
    }
    
    return { json: responseData };
  }
} 