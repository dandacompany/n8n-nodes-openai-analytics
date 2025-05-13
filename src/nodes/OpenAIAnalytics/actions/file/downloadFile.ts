import { INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import fetch from 'node-fetch';
import { INodeContext } from '../../types';

export async function downloadFile(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, items, i } = context;
  
  // 파일 선택 방식 확인
  const fileSelectionMethod = functionThis.getNodeParameter('fileSelectionMethod', i) as string;
  let fileId = '';
  
  // 선택 방식에 따라 파일 ID 가져오기
  if (fileSelectionMethod === 'byId') {
    fileId = functionThis.getNodeParameter('downloadFileId', i) as string;
  } else {
    fileId = functionThis.getNodeParameter('downloadFileId', i) as string;
  }
  
  const binaryPropertyName = functionThis.getNodeParameter('downloadBinaryPropertyName', i) as string;
  
  // 파일 정보 가져오기
  const fileInfo = await openai.files.retrieve(fileId);
  
  try {
    // 파일 콘텐츠 다운로드
    const apiKey = (openai as any).apiKey;
    const organization = (openai as any).organization || '';
    const baseURL = (openai as any).baseURL || 'https://api.openai.com/v1';
    
    const response = await fetch(`${baseURL}/files/${fileId}/content`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Organization': organization,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    // 파일 내용을 Buffer로 변환
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // 파일명 추출 또는 기본값 사용
    const fileName = fileInfo.filename || `file_${fileId}.bin`;
    
    // 파일 확장자에 따른 MIME 타입 추정
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'bin';
    let mimeType = 'application/octet-stream';
    const mimeTypes: {[key: string]: string} = {
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'json': 'application/json',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    
    if (fileExtension in mimeTypes) {
      mimeType = mimeTypes[fileExtension];
    }
    
    // 바이너리 데이터로 반환
    const newItem: INodeExecutionData = {
      json: {
        ...fileInfo as any,
        downloadSuccess: true,
      },
      binary: {
        [binaryPropertyName]: await functionThis.helpers.prepareBinaryData(
          buffer,
          fileName,
          mimeType
        ),
      },
    };
    
    // 원본 아이템을 수정
    items[i] = newItem;
    
    // 가공된 아이템 반환
    return newItem;
    
  } catch (error) {
    // 다운로드 실패 시 에러 정보 반환
    return {
      json: {
        error: true,
        message: (error as Error).message,
        fileInfo,
      }
    };
  }
} 