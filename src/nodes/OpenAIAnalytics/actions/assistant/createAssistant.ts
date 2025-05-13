import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function createAssistant(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  // 기본 정보 가져오기
  const name = functionThis.getNodeParameter('assistantName', i) as string;
  const description = functionThis.getNodeParameter('assistantDescription', i, '') as string;
  const instructions = functionThis.getNodeParameter('assistantInstructions', i, '') as string;
  const model = functionThis.getNodeParameter('assistantModel', i) as string;
  
  // 도구 설정 가져오기
  const useCodeInterpreter = functionThis.getNodeParameter('useCodeInterpreter', i, false) as boolean;
  const useFileSearch = functionThis.getNodeParameter('useRetrieval', i, false) as boolean;
  const useFunctionCalling = functionThis.getNodeParameter('useFunctionCalling', i, false) as boolean;
  
  // 응답 형식 가져오기
  const useResponseFormat = functionThis.getNodeParameter('useResponseFormat', i, false) as boolean;
  const responseFormat = useResponseFormat 
    ? functionThis.getNodeParameter('responseFormat', i, 'text') as string 
    : 'text';
  
  // 고급 설정 가져오기
  const useAdvancedSettings = functionThis.getNodeParameter('useAdvancedSettings', i, false) as boolean;
  // 기본값 설정 - 고급 설정을 사용하지 않을 경우에도 기본값을 명시적으로 설정
  let temperature = 1.0;
  let topP = 1.0;
  
  console.log('Creating assistant with advanced settings:', useAdvancedSettings);
  
  if (useAdvancedSettings) {
    try {
      temperature = functionThis.getNodeParameter('temperature', i, 1.0) as number;
      topP = functionThis.getNodeParameter('topP', i, 1.0) as number;
      console.log(`Advanced settings: temperature=${temperature}, topP=${topP}`);
    } catch (error: any) {
      console.error('Advanced 설정 가져오기 오류:', error);
      // 오류 발생시 기본값 사용
      temperature = 1.0;
      topP = 1.0;
    }
  }
  
  // 파일 첨부
  const useFileAttachments = functionThis.getNodeParameter('useFileAttachments', i, false) as boolean;
  let fileIds: string[] = [];
  
  if (useFileAttachments) {
    try {
      fileIds = functionThis.getNodeParameter('assistantFileIds', i, []) as string[];
      console.log('Attached file IDs:', fileIds);
    } catch (error: any) {
      console.error('파일 ID를 가져오는 중 오류 발생:', error);
      fileIds = [];
    }
  }
  
  // 도구 배열 생성
  const tools: any[] = [];
  // tool_resources 객체 초기화
  const toolResources: any = {};
  
  if (useCodeInterpreter) {
    tools.push({ type: 'code_interpreter' });
    toolResources.code_interpreter = { file_ids: [] };
  }
  
  if (useFileSearch) {
    tools.push({ type: 'file_search' });
    // file_search 도구를 위한 vector_store_ids는 필요 시 추가
    toolResources.file_search = { vector_store_ids: [] };
  }
  
  if (useFunctionCalling) {
    const functionJson = functionThis.getNodeParameter('functionJson', i, '') as string;
    
    if (functionJson) {
      try {
        const parsedFunction = JSON.parse(functionJson);
        tools.push({
          type: 'function',
          function: parsedFunction
        });
      } catch (error: any) {
        console.error('함수 JSON 파싱 오류:', error);
      }
    }
  }
  
  // Assistant 생성 파라미터 구성
  const assistantParams: any = {
    name,
    model,
    tools,
    temperature,
    top_p: topP,
  };
  
  // 선택적 매개변수 추가
  if (description) assistantParams.description = description;
  if (instructions) assistantParams.instructions = instructions;
  
  // tool_resources가 비어있지 않은 경우에만 추가
  if (Object.keys(toolResources).length > 0) {
    assistantParams.tool_resources = toolResources;
  }
  
  // 파일 첨부 - code_interpreter에 파일 추가
  if (fileIds.length > 0 && toolResources.code_interpreter) {
    toolResources.code_interpreter.file_ids = fileIds;
  }
  
  // 응답 형식 설정
  if (useResponseFormat) {
    assistantParams.response_format = { type: responseFormat };
  }
  
  try {
    // Assistant 생성 API 호출
    const assistant = await openai.beta.assistants.create(assistantParams);
    
    return {
      json: {
        success: true,
        assistant,
        message: `Assistant "${name}" successfully created with ID: ${assistant.id}`
      }
    };
  } catch (error: any) {
    console.error('Assistant 생성 오류:', error);
    
    // 오류 응답
    return {
      json: {
        success: false,
        error: error.message || 'Unknown error occurred',
        details: error.response?.data || error
      }
    };
  }
} 