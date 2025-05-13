import { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodeParameters, INodeProperties } from 'n8n-workflow';
import OpenAI from 'openai';

/**
 * 카테고리 임베딩 생성 함수
 * 카테고리 문자열에 대한 임베딩 벡터를 생성하여 UI 필드에 저장
 */
export async function generateCategoryEmbedding(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  index: number, 
  fieldData: INodeParameters,
  path: string[],
): Promise<INodeParameters> {
  try {
    // 현재 선택된 임베딩 모델 가져오기
    const embeddingModel = this.getNodeParameter('embeddingModel', index) as string;
    
    // 현재 카테고리 텍스트 가져오기
    const categoryText = fieldData.category as string;
    
    if (!categoryText || categoryText.trim() === '') {
      throw new Error('카테고리 텍스트가 비어 있습니다. 임베딩을 생성하려면 카테고리를 입력하세요.');
    }
    
    // OpenAI API 초기화
    const authentication = this.getNodeParameter('authentication', 0, 'openAIAnalyticsApi') as string;
    let openai: OpenAI;
    
    if (authentication === 'openAIAnalyticsApi') {
      const credentials = await this.getCredentials('openAIAnalyticsApi');
      openai = new OpenAI({
        apiKey: credentials.apiKey as string,
        organization: credentials.organizationId as string,
        baseURL: credentials.baseUrl as string || 'https://api.openai.com/v1',
      });
    } else {
      const credentials = await this.getCredentials('openAiApi');
      openai = new OpenAI({
        apiKey: credentials.apiKey as string,
        organization: credentials.organization as string,
        baseURL: credentials.baseURL as string || 'https://api.openai.com/v1',
      });
    }
    
    // 임베딩 생성 요청
    const embeddingResponse = await openai.embeddings.create({
      model: embeddingModel,
      input: categoryText,
    });
    
    // 임베딩 벡터 추출
    const embeddingVector = embeddingResponse.data[0].embedding;
    
    // 결과 반환 (필드 업데이트)
    return {
      ...fieldData,
      embedding: embeddingVector,
    };
  } catch (error) {
    // 에러 처리
    console.error('임베딩 생성 오류:', error);
    throw new Error(`카테고리 임베딩 생성 중 오류가 발생했습니다: ${(error as Error).message}`);
  }
}

export * from './file';
export * from './report';
export * from './text';
export * from './thread'; 