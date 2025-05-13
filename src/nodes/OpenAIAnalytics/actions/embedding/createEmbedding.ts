import { INodeExecutionData, IDataObject } from 'n8n-workflow';
import { INodeContext } from '../../types';

interface IEmbeddingWithText {
  embedding: number[];
  text: string;
  index?: number;
}

export async function createEmbedding(context: INodeContext): Promise<INodeExecutionData> {
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
  
  const options = functionThis.getNodeParameter('options', i, {}) as IDataObject;
  
  // 모델 설정
  const model = (options.model as string) || 'text-embedding-ada-002';
  
  // 응답 형식 설정
  const encodingFormat = (options.encodingFormat as string) || 'float';
  
  try {
    // OpenAI API 호출
    const response = await openai.embeddings.create({
      model,
      input,
      encoding_format: encodingFormat as 'float' | 'base64',
    });
    
    // 원본 임베딩 데이터
    const originalEmbeddingData = response.data;
    
    // 텍스트 정보를 포함한 새로운 임베딩 데이터 배열 생성
    let enhancedEmbeddingData: IEmbeddingWithText[] = [];
    
    // 단일 텍스트가 아닌 경우 각 임베딩에 원본 텍스트 추가
    if (Array.isArray(input) && originalEmbeddingData.length > 0) {
      enhancedEmbeddingData = originalEmbeddingData.map((item, index) => ({
        embedding: item.embedding,
        text: index < input.length ? input[index] : '',
        index: item.index,
      }));
    } else if (!Array.isArray(input) && originalEmbeddingData.length > 0) {
      // 단일 텍스트인 경우
      enhancedEmbeddingData = [{
        embedding: originalEmbeddingData[0].embedding,
        text: input as string,
        index: 0,
      }];
    }
    
    return {
      json: {
        success: true,
        model: response.model,
        usage: response.usage,
        data: enhancedEmbeddingData,
      },
    };
    
  } catch (error) {
    return {
      json: {
        success: false,
        error: (error as Error).message,
      },
    };
  }
} 