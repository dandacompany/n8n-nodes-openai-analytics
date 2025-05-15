import { INodeExecutionData, IDataObject } from 'n8n-workflow';
import { INodeContext } from '../../types';
import { simpleVectorSimilarity } from './simpleMemory';

interface ICategory {
  category: string;
  embedding: number[];
}

interface IEmbeddingClassificationResult extends IDataObject {
  category: string;
  similarity: number;
  categories?: { category: string; similarity: number }[];
  text: string;
  model: string;
  _categoryBranches?: IDataObject;
}

// 워크플로우 ID별 카테고리 임베딩을 저장하는 캐시
const categoryEmbeddingsCache = new Map<string, Map<string, number[]>>();

/**
 * 카테고리 목록의 해시값을 생성
 * @param categories 카테고리 목록
 * @returns 카테고리 목록의 해시값
 */
function getCategoriesHash(categories: Array<{ category: string; embedding: number[] }>): string {
  return categories.map(c => c.category).sort().join('|');
}

/**
 * 임베딩 기반 텍스트 분류기
 * 텍스트와 카테고리의 임베딩 벡터 간 유사도 계산으로 분류
 */
export async function embeddingBasedClassify(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  // 대상 텍스트 가져오기
  const targetText = functionThis.getNodeParameter('embeddingTargetText', i) as string;
  
  // 카테고리 목록 및 임베딩 가져오기
  const categoriesCollection = functionThis.getNodeParameter('embeddingCategories', i) as { values: Array<{ category: string; embedding: number[] }> };
  
  if (!categoriesCollection || !categoriesCollection.values || categoriesCollection.values.length === 0) {
    throw new Error('카테고리가 정의되지 않았습니다. 분류를 위한 카테고리를 추가해주세요.');
  }
  
  // 임베딩 모델 가져오기
  let embeddingModel: string;
  try {
    embeddingModel = functionThis.getNodeParameter('embeddingModel', i) as string;
  } catch (error) {
    // embeddingModel 파라미터가 없으면 기본값 사용
    console.log('embeddingModel 파라미터를 찾을 수 없습니다. 기본값을 사용합니다.');
    embeddingModel = 'text-embedding-3-small';
  }
  
  // 워크플로우 ID 가져오기 (캐싱에 사용)
  const workflowId = (functionThis.getNode().credentials?.workflowId || 
                      functionThis.getWorkflow().id || 
                      'default') as string;
  
  const cacheKey = `${workflowId}_${embeddingModel}`;
  
  // 결과 카테고리 배열 초기화
  let categories: ICategory[] = [];
  
  // 워크플로우에 대한 임베딩 캐시 가져오기 또는 새로 생성
  if (!categoryEmbeddingsCache.has(cacheKey)) {
    categoryEmbeddingsCache.set(cacheKey, new Map<string, number[]>());
  }
  
  const workflowEmbeddingCache = categoryEmbeddingsCache.get(cacheKey)!;
  
  // 카테고리별로 임베딩 처리
  for (const item of categoriesCollection.values) {
    let embedding = item.embedding;
    const category = item.category;
    
    // 임베딩이 없거나 빈 배열인 경우
    if (!embedding || embedding.length === 0) {
      // 캐시에 카테고리가 있는 경우 캐시 사용
      if (workflowEmbeddingCache.has(category)) {
        embedding = workflowEmbeddingCache.get(category)!;
        console.log(`카테고리 '${category}'에 대해 캐시된 임베딩을 사용합니다.`);
      } else {
        // 캐시에 없는 경우 새 임베딩 생성
        console.log(`카테고리 '${category}'에 대한 새 임베딩을 생성합니다.`);
        const embeddingResponse = await openai.embeddings.create({
          model: embeddingModel,
          input: category,
        });
        embedding = embeddingResponse.data[0].embedding;
        
        // 생성된 임베딩 캐싱
        workflowEmbeddingCache.set(category, embedding);
      }
    } else {
      // 사용자가 직접 임베딩을 제공한 경우 캐시 갱신
      workflowEmbeddingCache.set(category, embedding);
    }
    
    categories.push({
      category,
      embedding,
    });
  }
  
  // 캐시 통계 로깅
  console.log(`워크플로우 '${workflowId}'에 대한 임베딩 캐시: ${workflowEmbeddingCache.size}개 카테고리`);
  
  // 대상 텍스트 임베딩 생성
  const embeddingResponse = await openai.embeddings.create({
    model: embeddingModel,
    input: targetText,
  });
  
  const targetEmbedding = embeddingResponse.data[0].embedding;
  
  // 유사도 임계값 가져오기
  const similarityThreshold = functionThis.getNodeParameter('embeddingThreshold', i, 0.7) as number;
  
  // 분류 타입 가져오기 (단일 또는 다중)
  const classificationType = functionThis.getNodeParameter('embeddingClassificationType', i, 'single') as string;
  
  // 브랜칭 사용 여부 가져오기
  const useBranching = functionThis.getNodeParameter('embeddingUseBranching', i, true) as boolean;
  
  // 각 카테고리와의 유사도 계산
  const similarities = categories.map(category => ({
    category: category.category,
    similarity: simpleVectorSimilarity(targetEmbedding, category.embedding),
  }));
  
  // 유사도가 높은 순으로 정렬
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  // 결과 생성
  let result: IEmbeddingClassificationResult;
  
  if (classificationType === 'single') {
    // 가장 유사한 카테고리 선택 (임계값 이상인 경우만)
    const bestMatch = similarities[0] || { category: 'unclassified', similarity: 0 };
    
    result = {
      category: bestMatch.similarity >= similarityThreshold ? bestMatch.category : 'unclassified',
      similarity: bestMatch.similarity,
      text: targetText,
      model: embeddingModel,
    };
  } else {
    // 임계값 이상인 모든 카테고리 선택
    const matchingCategories = similarities.filter(item => item.similarity >= similarityThreshold);
    
    result = {
      category: matchingCategories.length > 0 ? matchingCategories[0].category : 'unclassified',
      similarity: matchingCategories.length > 0 ? matchingCategories[0].similarity : 0,
      categories: matchingCategories,
      text: targetText,
      model: embeddingModel,
    };
  }
  
  // 브랜치 데이터 추가
  if (useBranching) {
    const branchData: IDataObject = {};
    for (const category of categories) {
      branchData[category.category] = category.category === result.category;
    }
    result._categoryBranches = branchData;
  }
  
  return {
    json: result,
  };
} 