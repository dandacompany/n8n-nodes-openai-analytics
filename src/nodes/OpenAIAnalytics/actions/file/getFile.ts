import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function getFile(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  // 파일 선택 방식 확인
  const fileSelectionMethod = functionThis.getNodeParameter('fileSelectionMethod', i) as string;
  let fileId = '';
  
  // 선택 방식에 따라 파일 ID 가져오기
  if (fileSelectionMethod === 'byId') {
    fileId = functionThis.getNodeParameter('fileId', i) as string;
  } else {
    fileId = functionThis.getNodeParameter('fileId', i) as string;
  }
  
  const file = await openai.files.retrieve(fileId);
  
  return {
    json: { ...file as any }
  };
} 