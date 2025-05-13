import { INodeExecutionData, IDataObject } from 'n8n-workflow';
import { INodeContext } from '../../types';

interface ILlmClassificationResult extends IDataObject {
  category: string;
  confidence: number;
  original_response: string;
  text: string;
  categories: string[];
  model: string;
  _categoryBranches?: IDataObject;
}

/**
 * LLM 기반 텍스트 분류기
 * 바로 LLM에 질의해서 카테고리 분류를 수행
 */
export async function llmBasedClassify(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  // 대상 텍스트 가져오기
  const targetText = functionThis.getNodeParameter('llmTargetText', i) as string;
  
  // 카테고리 목록 가져오기
  const categoriesCollection = functionThis.getNodeParameter('llmCategories', i) as { values: Array<{ category: string }> };
  
  if (!categoriesCollection || !categoriesCollection.values || categoriesCollection.values.length === 0) {
    throw new Error('카테고리가 정의되지 않았습니다. 분류를 위한 카테고리를 추가해주세요.');
  }
  
  const categories = categoriesCollection.values.map(item => item.category);
  
  // LLM 모델 가져오기
  let llmModel: string;
  try {
    llmModel = functionThis.getNodeParameter('llmModel', i) as string;
  } catch (error) {
    // llmModel 파라미터가 없으면 기본값 사용
    console.log('llmModel 파라미터를 찾을 수 없습니다. 기본값을 사용합니다.');
    llmModel = 'gpt-4o-mini';
  }
  
  // 응답 형식 가져오기
  const responseFormat = functionThis.getNodeParameter('llmResponseFormat', i, 'json') as string;
  
  // 브랜칭 사용 여부 가져오기
  const useBranching = functionThis.getNodeParameter('llmUseBranching', i, true) as boolean;
  
  // LLM에 전달할 프롬프트 생성
  let systemPrompt = `당신은 텍스트 분류 전문가입니다. 주어진 텍스트를 다음 카테고리 중 하나로 정확하게 분류해 주세요: ${categories.join(', ')}. 
가장 적절한 카테고리 하나만 선택하세요.`;

  if (responseFormat === 'json') {
    systemPrompt += `\n\n다음 JSON 형식으로 응답해 주세요:
{
  "category": "선택한 카테고리명",
  "confidence": 0.0~1.0 사이의 신뢰도 점수,
  "reasoning": "이 카테고리를 선택한 이유에 대한 간단한 설명"
}`;
  }

  // OpenAI API 호출
  const response = await openai.chat.completions.create({
    model: llmModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: targetText },
    ],
    response_format: responseFormat === 'json' ? { type: 'json_object' } : { type: 'text' },
    temperature: 0.3,
  });

  // 결과 처리
  let result: ILlmClassificationResult;

  if (responseFormat === 'json') {
    try {
      const jsonResponse = JSON.parse(response.choices[0].message.content || '{}');
      
      result = {
        category: jsonResponse.category || 'unclassified',
        confidence: jsonResponse.confidence || 0,
        original_response: response.choices[0].message.content || '',
        text: targetText,
        categories,
        model: llmModel,
        reasoning: jsonResponse.reasoning || '',
      };
    } catch (error) {
      // JSON 파싱 오류 시 기본 응답 생성
      console.error('JSON 파싱 오류:', error);
      result = {
        category: 'error',
        confidence: 0,
        original_response: response.choices[0].message.content || '',
        text: targetText,
        categories,
        model: llmModel,
        error: (error as Error).message,
      };
    }
  } else {
    // 텍스트 응답 처리
    const textResponse = response.choices[0].message.content || '';
    
    result = {
      category: textResponse.trim(),
      confidence: 1.0, // 텍스트 모드에서는 신뢰도 정보 없음
      original_response: textResponse,
      text: targetText,
      categories,
      model: llmModel,
    };
  }
  
  // 브랜치 데이터 추가
  if (useBranching) {
    const branchData: IDataObject = {};
    for (const category of categories) {
      branchData[category] = category === result.category;
    }
    result._categoryBranches = branchData;
  }
  
  return {
    json: result,
  };
}

/**
 * LLM 응답에서 가장 적합한 카테고리 찾기
 */
function findBestCategory(response: string, categories: string[]): string {
  // 공백, 구두점 제거하고 소문자로 변환
  const normalizedResponse = response.toLowerCase().trim().replace(/[.,:;]/g, '');
  
  // 정확히 일치하는 카테고리 찾기
  for (const category of categories) {
    if (normalizedResponse === category.toLowerCase()) {
      return category;
    }
  }
  
  // 포함하는 카테고리 찾기
  for (const category of categories) {
    if (normalizedResponse.includes(category.toLowerCase())) {
      return category;
    }
  }
  
  // 유사한 단어 찾기 (간단한 구현)
  for (const category of categories) {
    const categoryWords = category.toLowerCase().split(/\s+/);
    for (const word of categoryWords) {
      if (word.length > 3 && normalizedResponse.includes(word)) {
        return category;
      }
    }
  }
  
  // 매칭되는 카테고리가 없으면 '미분류'로 처리
  return 'unclassified';
} 