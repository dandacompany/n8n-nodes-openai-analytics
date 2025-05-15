import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

/**
 * 두 벡터 간의 코사인 유사도를 계산합니다.
 * @param vec1 첫 번째 벡터
 * @param vec2 두 번째 벡터
 * @returns 코사인 유사도 (0~1 사이의 값, 1에 가까울수록 유사)
 */
function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('벡터의 차원이 일치하지 않습니다.');
  }
  
  // 두 벡터의 내적 계산
  let dotProduct = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
  }
  
  // 각 벡터의 크기 계산
  let magnitude1 = 0;
  let magnitude2 = 0;
  for (let i = 0; i < vec1.length; i++) {
    magnitude1 += vec1[i] * vec1[i];
    magnitude2 += vec2[i] * vec2[i];
  }
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  // 코사인 유사도 계산
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0; // 0 벡터는 방향이 없으므로 유사도 0
  }
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * 문자열을 유효한 JSON 배열로 파싱하는 함수입니다.
 * 유연한 입력 처리를 위해 다양한 형식을 지원합니다.
 * @param input 입력 문자열
 * @returns 파싱된 숫자 배열
 */
function parseVectorInput(input: string): number[] {
  // 입력 문자열 전처리
  const trimmed = input.trim();
  
  // n8n 표현식 패턴 확인 (예: {{ $json.data[0].embedding }})
  const n8nExprPattern = /{{[\s]*\$json[^}]+}}/;
  if (n8nExprPattern.test(trimmed)) {
    throw new Error(
      'n8n 표현식은 직접 입력 모드에서 처리할 수 없습니다. 대신 "JSON 경로" 입력 방식을 선택하고 해당 경로를 입력하세요. ' +
      '예: data.embedding 또는 data[0].embedding'
    );
  }
  
  try {
    // 먼저 기본 JSON 파싱 시도
    return JSON.parse(trimmed);
  } catch (error) {
    // JSON 파싱 실패 시 다양한 형식 처리 시도
    
    // 1. 쉼표로만 구분된 목록 처리 (예: 0.1, 0.2, 0.3)
    if (!trimmed.startsWith('[') && !trimmed.endsWith(']')) {
      try {
        return JSON.parse(`[${trimmed}]`);
      } catch (e) {
        // 무시하고 다음 방법 시도
      }
    }
    
    // 2. 대괄호는 있지만 따옴표나 다른 형식 문제 (예: [0.1, 0.2, 0.3,])
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        // 끝에 쉼표가 있는 경우 제거
        const cleaned = trimmed
          .replace(/,\s*]/g, ']') // 마지막 쉼표 제거
          .replace(/,,+/g, ',')   // 연속된 쉼표 제거
          .replace(/\[\s*,/g, '['); // 시작 부분 쉼표 제거
        
        return JSON.parse(cleaned);
      } catch (e) {
        // 무시하고 다음 방법 시도
      }
    }
    
    // 3. 공백이나 다른 구분자로 나뉜 숫자 목록 (예: "0.1 0.2 0.3" 또는 "0.1|0.2|0.3")
    try {
      // 공백, 탭, 줄바꿈, 쉼표, 파이프, 세미콜론으로 분리
      const numbers = trimmed
        .replace(/[\[\]]/g, '') // 대괄호 제거
        .split(/[\s,|;]+/)      // 다양한 구분자로 분리
        .filter(item => item.trim() !== '') // 빈 항목 제거
        .map(item => parseFloat(item));     // 숫자로 변환
      
      // NaN이 없는지 확인
      if (numbers.some(isNaN)) {
        throw new Error('유효하지 않은 숫자가 포함되어 있습니다.');
      }
      
      return numbers;
    } catch (e) {
      // 모든 방법 실패 시 원래 오류 다시 발생
      throw new Error(`입력을 유효한 벡터로 파싱할 수 없습니다: ${trimmed}`);
    }
  }
}

/**
 * 임베딩 벡터 간의 코사인 유사도를 계산합니다.
 */
export async function computeCosineSimilarity(context: INodeContext): Promise<INodeExecutionData> {
  const { functionThis, i } = context;
  
  // 입력 벡터들 가져오기
  const inputType = functionThis.getNodeParameter('cosineInputType', i) as string;
  let vector1: number[] = [];
  let vector2: number[] = [];
  
  try {
    if (inputType === 'direct') {
      // 직접 입력된 벡터 사용 - 유연한 파싱 함수 사용
      const vector1Input = functionThis.getNodeParameter('vector1', i) as string;
      const vector2Input = functionThis.getNodeParameter('vector2', i) as string;
      
      vector1 = parseVectorInput(vector1Input);
      vector2 = parseVectorInput(vector2Input);
    } else if (inputType === 'jsonPath') {
      // JSON 경로를 통해 입력 항목에서 벡터 추출
      const vector1Path = functionThis.getNodeParameter('vector1Path', i) as string;
      const vector2Path = functionThis.getNodeParameter('vector2Path', i) as string;
      
      // 경로 정규화 - $json. 접두사 처리
      const normalizedPath1 = vector1Path.startsWith('$json.') 
        ? vector1Path.substring(6) // $json. 제거
        : vector1Path;
      const normalizedPath2 = vector2Path.startsWith('$json.') 
        ? vector2Path.substring(6) // $json. 제거
        : vector2Path;
      
      const inputItem = context.items[i];
      
      // 경로에 따라 벡터 값 가져오기
      try {
        const getValue = (obj: any, path: string) => {
          return path.split('.').reduce((o, p) => {
            // 배열 인덱스 처리 [n]
            const arrayMatch = p.match(/^(.+)\[(\d+)\]$/);
            if (arrayMatch) {
              const propName = arrayMatch[1];
              const index = parseInt(arrayMatch[2]);
              return o && o[propName] ? o[propName][index] : undefined;
            }
            return o && o[p] !== undefined ? o[p] : undefined;
          }, obj);
        };
        
        // 입력 항목에서 벡터 추출
        const rawVector1 = getValue(inputItem.json, normalizedPath1);
        const rawVector2 = getValue(inputItem.json, normalizedPath2);
        
        // 벡터 값 검증 및 변환
        if (!rawVector1) {
          throw new Error(`경로 '${vector1Path}'에서 벡터를 찾을 수 없습니다.`);
        }
        if (!rawVector2) {
          throw new Error(`경로 '${vector2Path}'에서 벡터를 찾을 수 없습니다.`);
        }
        
        // 배열 형태 확인
        vector1 = Array.isArray(rawVector1) ? rawVector1 : JSON.parse(rawVector1);
        vector2 = Array.isArray(rawVector2) ? rawVector2 : JSON.parse(rawVector2);
      } catch (error) {
        throw new Error(`JSON 경로에서 벡터를 추출하는 중 오류가 발생했습니다: ${(error as Error).message}`);
      }
    } else if (inputType === 'binaryProperty') {
      // 바이너리 속성에서 벡터 추출
      const vectorProperty1 = functionThis.getNodeParameter('vectorProperty1', i) as string;
      const vectorProperty2 = functionThis.getNodeParameter('vectorProperty2', i) as string;
      
      const inputItem = context.items[i];
      if (inputItem.binary && inputItem.binary[vectorProperty1]) {
        const buffer1 = Buffer.from(inputItem.binary[vectorProperty1].data, 'base64');
        vector1 = JSON.parse(buffer1.toString());
      }
      
      if (inputItem.binary && inputItem.binary[vectorProperty2]) {
        const buffer2 = Buffer.from(inputItem.binary[vectorProperty2].data, 'base64');
        vector2 = JSON.parse(buffer2.toString());
      }
    }
    
    // 벡터 유효성 검사
    if (!Array.isArray(vector1) || vector1.length === 0) {
      throw new Error('첫 번째 벡터가 유효한 배열이 아닙니다.');
    }
    
    if (!Array.isArray(vector2) || vector2.length === 0) {
      throw new Error('두 번째 벡터가 유효한 배열이 아닙니다.');
    }
    
    // 벡터 값이 모두 숫자인지 확인
    if (vector1.some(v => typeof v !== 'number' || isNaN(v))) {
      throw new Error('첫 번째 벡터에 숫자가 아닌 값이 포함되어 있습니다.');
    }
    
    if (vector2.some(v => typeof v !== 'number' || isNaN(v))) {
      throw new Error('두 번째 벡터에 숫자가 아닌 값이 포함되어 있습니다.');
    }
    
    // 코사인 유사도 계산
    const similarity = calculateCosineSimilarity(vector1, vector2);
    
    // 결과 반환
    const returnData: INodeExecutionData = {
      json: {
        cosineSimilarity: similarity,
        vector1Length: vector1.length,
        vector2Length: vector2.length,
        normalizedSimilarity: (similarity + 1) / 2, // -1~1 범위를 0~1 범위로 정규화 (선택적)
      },
    };
    
    const inputItem = context.items[i];
    if (inputItem.binary) {
      returnData.binary = { ...inputItem.binary };
    }
    
    return returnData;
  } catch (error) {
    throw new Error(`코사인 유사도 계산 중 오류가 발생했습니다: ${(error as Error).message}`);
  }
} 