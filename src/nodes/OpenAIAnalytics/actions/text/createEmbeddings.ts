import { INodeExecutionData, IDataObject } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function createEmbeddings(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  const inputType = functionThis.getNodeParameter('inputType', i) as string;
  let input: string | string[] = '';
  
  if (inputType === 'singleText') {
    input = functionThis.getNodeParameter('text', i) as string;
  } else if (inputType === 'multipleTexts') {
    input = functionThis.getNodeParameter('texts', i) as string[];
  } else if (inputType === 'jsonInput') {
    const jsonData = functionThis.getNodeParameter('jsonInput', i) as string;
    input = JSON.parse(jsonData) as string[];
  }
  
  const options = functionThis.getNodeParameter('options', i) as {
    dimensions?: number;
    encodingFormat?: 'float' | 'base64';
    user?: string;
  };
  
  // 임베딩 생성을 위한 파라미터 구성
  const embeddingParams: any = {
    model: functionThis.getNodeParameter('embeddingModel', i) as string,
    input,
  };
  
  // 추가 옵션 적용
  if (options.dimensions && options.dimensions > 0) {
    embeddingParams.dimensions = options.dimensions;
  }
  
  if (options.encodingFormat) {
    embeddingParams.encoding_format = options.encodingFormat;
  }
  
  if (options.user) {
    embeddingParams.user = options.user;
  }
  
  // 임베딩 생성
  const embeddingsResponse = await openai.embeddings.create(embeddingParams);
  
  // API 응답을 IDataObject로 변환
  const jsonResponse: IDataObject = {};
  Object.assign(jsonResponse, embeddingsResponse);
  
  return {
    json: jsonResponse,
  };
} 