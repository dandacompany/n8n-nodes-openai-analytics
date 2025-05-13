import { INodeExecutionData, IDataObject } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function generateHtmlReport(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  // 매개변수 추출
  const prompt = functionThis.getNodeParameter('reportPrompt', i) as string;
  const inputText = functionThis.getNodeParameter('reportInputText', i) as string;
  const model = functionThis.getNodeParameter('reportModel', i) as string;
  const includeDefaultLibraries = functionThis.getNodeParameter('includeDefaultLibraries', i, true) as boolean;
  const binaryPropertyName = functionThis.getNodeParameter('reportBinaryPropertyName', i, 'data') as string;
  
  // 추가 라이브러리
  const extraCssLibraries = functionThis.getNodeParameter('extraCssLibraries', i, []) as string[];
  const extraJsLibraries = functionThis.getNodeParameter('extraJsLibraries', i, []) as string[];
  
  // 고급 설정
  const advancedSettings = functionThis.getNodeParameter('advancedSettings', i, false) as boolean;
  let temperature = 0.7;
  let maxTokens = 4096;
  let topP = 1;
  
  if (advancedSettings) {
    temperature = functionThis.getNodeParameter('temperature', i, 0.7) as number;
    maxTokens = functionThis.getNodeParameter('maxTokens', i, 4096) as number;
    topP = functionThis.getNodeParameter('topP', i, 1) as number;
  }
  
  // 기본 라이브러리 설정
  const defaultCssLibraries = [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  ];
  
  const defaultJsLibraries = [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.3.0/dist/chart.umd.min.js',
  ];
  
  // 사용할 모든 라이브러리 병합
  const cssLibraries = includeDefaultLibraries
    ? [...defaultCssLibraries, ...extraCssLibraries]
    : extraCssLibraries;
  
  const jsLibraries = includeDefaultLibraries
    ? [...defaultJsLibraries, ...extraJsLibraries]
    : extraJsLibraries;
  
  // 프롬프트 구성
  const systemPrompt = `당신은 전문 데이터 분석가이자 웹 개발자입니다. 
사용자의 데이터를 분석하고 시각적으로 아름다운 HTML 보고서를 생성해야 합니다.

보고서 규칙:
1. 반응형 디자인을 사용하여 모든 기기에서 잘 보이도록 합니다.
2. 모던하고 전문적인 디자인으로 작성합니다.
3. 데이터를 명확하게 시각화하고 분석 인사이트를 제공합니다.
4. 적절한 차트와 그래프를 활용합니다.
5. 필요한 경우 테이블로 정보를 구조화합니다.
6. 사용자가 제공한 데이터만 사용하고 허위 데이터를 생성하지 마세요.

다음의 라이브러리를 사용할 수 있습니다:
- CSS: ${cssLibraries.join(', ')}
- JS: ${jsLibraries.join(', ')}

완전한 HTML 문서를 제공하세요. <html>, <head>, <body> 태그를 모두 포함해야 합니다.
CSS와 JavaScript는 문서 내에 포함하세요.`;

  const userPrompt = `${prompt}\n\n데이터:\n${inputText}`;
  
  try {
    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
    });
    
    // 응답 추출
    const htmlContent = completion.choices[0]?.message?.content || '';
    
    // 이진 데이터 생성
    const binaryData = Buffer.from(htmlContent);
    
    // 이진 데이터 반환
    return {
      json: {
        success: true,
        reportGenerated: true,
        reportSize: binaryData.length,
      },
      binary: {
        [binaryPropertyName]: {
          data: binaryData.toString('base64'),
          mimeType: 'text/html',
          fileName: 'report.html',
        },
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