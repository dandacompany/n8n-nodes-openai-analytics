import { INodeExecutionData } from 'n8n-workflow';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { INodeContext } from '../../types';

export async function uploadFile(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, items, i } = context;
  
  const binaryPropertyName = functionThis.getNodeParameter('binaryPropertyName', i) as string;
  const purpose = functionThis.getNodeParameter('filePurpose', i) as string;
  
  // 모든 바이너리 속성을 찾아 업로드
  const item = items[i];
  const binaryProperties: string[] = [];
  
  // 기본 바이너리 속성 확인
  if (item.binary?.[binaryPropertyName]) {
    binaryProperties.push(binaryPropertyName);
  }
  
  // 여러 바이너리 속성 확인 (data_1, data_2 등)
  if (binaryPropertyName === 'data') {
    for (const key of Object.keys(item.binary || {})) {
      if (key.startsWith('data_') && !isNaN(Number(key.split('_')[1]))) {
        binaryProperties.push(key);
      }
    }
  }
  
  // 업로드된 파일들의 ID 목록
  const uploadedFiles = [];
  
  // 각 바이너리 속성에 대해 파일 업로드
  for (const prop of binaryProperties) {
    const binaryData = item.binary?.[prop];
    if (!binaryData) continue;
    
    // 바이너리 데이터를 스트림으로 변환
    const buffer = Buffer.from(binaryData.data, 'base64');
    const originalFileName = binaryData.fileName || `file_${Date.now()}.${binaryData.fileExtension || 'bin'}`;
    const tempFilePath = path.join(os.tmpdir(), originalFileName);
    fs.writeFileSync(tempFilePath, buffer);
    const fileStream = fs.createReadStream(tempFilePath);
    
    // 타입 문제 해결을 위한 업로드 파라미터 생성
    const uploadParams: any = {
      file: fileStream,
      purpose: purpose === 'assistants_input' ? 'assistants_input' : purpose,
    };
    
    const fileUploadResult = await openai.files.create(uploadParams);
    
    // 임시 파일 삭제
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      // 파일 삭제 실패 시 무시
    }
    
    uploadedFiles.push(fileUploadResult);
  }
  
  // 업로드된 모든 파일 정보 반환
  if (uploadedFiles.length === 1) {
    return {
      json: { ...uploadedFiles[0] as any }
    };
  } else {
    return {
      json: { files: uploadedFiles as any[] }
    };
  }
} 