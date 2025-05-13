import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function parseJson(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  const jsonInput = functionThis.getNodeParameter('jsonInput', i) as string;
  const useAiFix = functionThis.getNodeParameter('useAiFix', i, true) as boolean;
  
  // useAiFix가 true인 경우에만 fixModel 파라미터를 가져옴
  let fixModel = 'gpt-4o-mini';
  if (useAiFix) {
    try {
      fixModel = functionThis.getNodeParameter('fixModel', i) as string;
    } catch (err) {
      // fixModel 파라미터를 가져오지 못한 경우 기본값 사용
    }
  }
  
  // 문자열 전처리 (공백 제거 등)
  const cleanInput = jsonInput.trim();
  
  // JSON 추출 전략
  let jsonString = cleanInput;
  let extractMethod = 'raw';
  
  // 1. 먼저 전체 입력이 유효한 JSON인지 확인
  try {
    JSON.parse(cleanInput);
    // 이미 유효한 JSON이면 그대로 사용
    extractMethod = 'full';
  } catch (initialError) {
    // 유효하지 않으면 첫 번째 중괄호 또는 대괄호 사이의 콘텐츠 추출 시도
    try {
      // JSON 객체({}) 또는 배열([]) 시작과 끝 검색
      const firstCurlyBrace = cleanInput.indexOf('{');
      const firstSquareBracket = cleanInput.indexOf('[');
      
      let startPosition = -1;
      let endPosition = -1;
      let isObject = false;
      
      // 객체와 배열 중 먼저 시작하는 것 찾기
      if (firstCurlyBrace !== -1 && (firstSquareBracket === -1 || firstCurlyBrace < firstSquareBracket)) {
        startPosition = firstCurlyBrace;
        isObject = true;
      } else if (firstSquareBracket !== -1) {
        startPosition = firstSquareBracket;
        isObject = false;
      }
      
      if (startPosition !== -1) {
        // 시작 위치 찾기 성공
        // 이제 짝이 맞는 괄호를 찾아 JSON 끝 위치 결정
        const stack = [];
        const openChar = isObject ? '{' : '[';
        const closeChar = isObject ? '}' : ']';
        
        let foundEnd = false;
        
        // 균형잡힌 괄호를 찾기 위해 스택 사용
        for (let pos = startPosition; pos < cleanInput.length; pos++) {
          const char = cleanInput[pos];
          
          if (char === openChar) {
            stack.push(char);
          } else if (char === closeChar) {
            stack.pop();
            
            // 스택이 비었다면 짝이 맞는 닫는 괄호를 찾은 것
            if (stack.length === 0) {
              endPosition = pos + 1; // +1은 닫는 괄호 포함
              foundEnd = true;
              break;
            }
          }
        }
        
        // 끝 위치를 찾았으면 추출
        if (foundEnd) {
          jsonString = cleanInput.substring(startPosition, endPosition);
          extractMethod = 'balanced';
        }
      }
    } catch (extractError) {
      // 추출 중 오류 발생 시 기존 정규식 방법 시도
      const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g;
      const arrayRegex = /\[(?:[^\[\]]|\[(?:[^\[\]]|\[[^\[\]]*\])*\])*\]/g;
      
      // 정규식으로 찾은 모든 JSON 문자열
      const jsonMatches = [...(cleanInput.match(jsonRegex) || []), ...(cleanInput.match(arrayRegex) || [])];
      
      // 찾은 JSON 문자열이 있으면 첫 번째 것 사용
      if (jsonMatches.length > 0) {
        jsonString = jsonMatches[0];
        extractMethod = 'regex';
      }
    }
  }
  
  try {
    // JSON 파싱 시도
    const parsedData = JSON.parse(jsonString);
    return {
      json: {
        success: true,
        data: parsedData,
        parsed_result: parsedData, // 결과를 직접 접근 가능하도록 추가
        original: jsonString,
        extract_method: extractMethod,
      }
    };
  } catch (error: any) {
    // JSON 파싱 실패 - useAiFix가 true인 경우에만 OpenAI로 수정 시도
    if (useAiFix) {
      try {
        // OpenAI를 사용하여 JSON 수정 시도
        const fixedJsonResponse = await openai.chat.completions.create({
          model: fixModel,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that fixes JSON syntax errors. Return only the corrected JSON with no explanations or other text.'
            },
            {
              role: 'user',
              content: `Fix this JSON and return only the corrected JSON:\n\n${jsonString}`
            }
          ],
        });
        
        // 수정된 JSON 추출
        let fixedJsonContent = fixedJsonResponse.choices[0].message?.content || '';
        
        // 불필요한 공백과 마크다운 코드 블록 제거
        fixedJsonContent = fixedJsonContent.trim()
          .replace(/^```(?:json)?[\r\n]/, '')
          .replace(/[\r\n]```$/, '')
          .trim();
        
        try {
          // 수정된 JSON 파싱 시도
          const parsedFixedData = JSON.parse(fixedJsonContent);
          return {
            json: {
              success: true,
              data: parsedFixedData,
              original: jsonString,
              fixed: fixedJsonContent,
              error: (error as Error).message,
              fixed_by: 'openai',
              extract_method: extractMethod,
            }
          };
        } catch (secondError) {
          // 수정된 JSON도 파싱 실패, 더 적극적인 추출 시도
          try {
            // 마크다운 코드 블록이나 여러 공백이 있을 수 있으므로 패턴 다시 시도
            const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g;
            const arrayRegex = /\[(?:[^\[\]]|\[(?:[^\[\]]|\[[^\[\]]*\])*\])*\]/g;
            
            const fixedJsonMatches = [
              ...(fixedJsonContent.match(jsonRegex) || []), 
              ...(fixedJsonContent.match(arrayRegex) || [])
            ];
            
            if (fixedJsonMatches.length > 0) {
              const extractedFixedJson = fixedJsonMatches[0];
              const parsedExtractedData = JSON.parse(extractedFixedJson);
              
              return {
                json: {
                  success: true,
                  data: parsedExtractedData,
                  original: jsonString,
                  fixed: extractedFixedJson,
                  error: (error as Error).message,
                  secondError: (secondError as Error).message,
                  fixed_by: 'openai+regex',
                  extract_method: `${extractMethod}+regex`,
                }
              };
            } else {
              throw new Error('No valid JSON pattern found in AI response');
            }
          } catch (thirdError) {
            // 모든 시도 실패
            return {
              json: {
                success: false,
                error: (error as Error).message,
                secondError: (secondError as Error).message,
                thirdError: (thirdError as Error).message,
                original: jsonString,
                attempted_fix: fixedJsonContent,
                extract_method: extractMethod,
              }
            };
          }
        }
      } catch (aiError) {
        // OpenAI 호출 실패
        return {
          json: {
            success: false,
            error: (error as Error).message,
            aiError: (aiError as Error).message,
            original: jsonString,
            extract_method: extractMethod,
          }
        };
      }
    } else {
      // AI 수정 사용 안 함
      return {
        json: {
          success: false,
          error: (error as Error).message,
          original: jsonString,
          extract_method: extractMethod,
        }
      };
    }
  }
} 