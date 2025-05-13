import { IDataObject } from 'n8n-workflow';

/**
 * 임베딩 데이터를 저장하고 관리하는 단순 메모리 클래스
 */
export class SimpleMemory {
  private static instance: SimpleMemory;
  private memory: Map<string, IDataObject>;

  private constructor() {
    this.memory = new Map();
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  public static getInstance(): SimpleMemory {
    if (!SimpleMemory.instance) {
      SimpleMemory.instance = new SimpleMemory();
    }
    return SimpleMemory.instance;
  }

  /**
   * 임베딩 데이터 저장하기
   * @param key 데이터 식별 키
   * @param data 저장할 데이터
   */
  public store(key: string, data: IDataObject): void {
    this.memory.set(key, data);
  }

  /**
   * 임베딩 데이터 가져오기
   * @param key 데이터 식별 키
   * @returns 저장된 데이터 또는 undefined (없는 경우)
   */
  public retrieve(key: string): IDataObject | undefined {
    return this.memory.get(key);
  }

  /**
   * 모든 임베딩 데이터 가져오기
   * @returns 모든 저장된 데이터 맵
   */
  public getAll(): Map<string, IDataObject> {
    return new Map(this.memory);
  }

  /**
   * 특정 키로 시작하는 모든 데이터 가져오기
   * @param prefix 키 접두사
   * @returns 접두사로 시작하는 모든 데이터 객체의 배열
   */
  public getAllByPrefix(prefix: string): IDataObject[] {
    const result: IDataObject[] = [];
    
    for (const [key, value] of this.memory.entries()) {
      if (key.startsWith(prefix)) {
        result.push(value);
      }
    }
    
    return result;
  }

  /**
   * 데이터 삭제하기
   * @param key 삭제할 데이터의 키
   * @returns 삭제 성공 여부
   */
  public remove(key: string): boolean {
    return this.memory.delete(key);
  }

  /**
   * 특정 접두사로 시작하는 모든 데이터 삭제하기
   * @param prefix 키 접두사
   * @returns 삭제된 데이터 수
   */
  public removeByPrefix(prefix: string): number {
    let count = 0;
    
    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) {
        this.memory.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * 모든 데이터 삭제하기
   */
  public clear(): void {
    this.memory.clear();
  }

  /**
   * 저장된 데이터 수 가져오기
   */
  public size(): number {
    return this.memory.size;
  }
}

// 인스턴스 내보내기
export const memoryInstance = SimpleMemory.getInstance();

/**
 * 벡터 간 코사인 유사도를 계산합니다.
 * 두 벡터 간의 코사인 각도를 기반으로 -1과 1 사이의 유사도 값을 반환합니다.
 * 1에 가까울수록 유사, -1에 가까울수록 반대, 0은 관계 없음을 의미합니다.
 */
export function simpleVectorSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('벡터 길이가 일치하지 않습니다.');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 간단한 인메모리 캐시 구현체
 * 워크플로우 ID별로 키-값 쌍을 저장합니다.
 */
export class MemoryCache<T> {
  private cache: Map<string, Map<string, T>> = new Map();
  
  // 싱글톤 패턴을 위한 구현
  private static instance: MemoryCache<any>;
  
  private constructor() {
    // 싱글톤 패턴을 위한 private 생성자
  }
  
  public static getInstance<T>(): MemoryCache<T> {
    if (!MemoryCache.instance) {
      MemoryCache.instance = new MemoryCache<T>();
    }
    return MemoryCache.instance;
  }

  /**
   * 지정된 워크플로우 및 키에 대한 값을 저장합니다.
   */
  set(workflowId: string, key: string, value: T): void {
    if (!this.cache.has(workflowId)) {
      this.cache.set(workflowId, new Map<string, T>());
    }
    
    const workflowCache = this.cache.get(workflowId)!;
    workflowCache.set(key, value);
  }

  /**
   * 지정된 워크플로우 및 키에 대한 값을 가져옵니다.
   */
  get(workflowId: string, key: string): T | undefined {
    const workflowCache = this.cache.get(workflowId);
    if (!workflowCache) {
      return undefined;
    }
    
    return workflowCache.get(key);
  }

  /**
   * 지정된 워크플로우 및 키에 대한 값이 있는지 확인합니다.
   */
  has(workflowId: string, key: string): boolean {
    const workflowCache = this.cache.get(workflowId);
    if (!workflowCache) {
      return false;
    }
    
    return workflowCache.has(key);
  }

  /**
   * 지정된 워크플로우 및 키에 대한 값을 삭제합니다.
   */
  delete(workflowId: string, key: string): boolean {
    const workflowCache = this.cache.get(workflowId);
    if (!workflowCache) {
      return false;
    }
    
    return workflowCache.delete(key);
  }

  /**
   * 지정된 워크플로우의 모든 값을 삭제합니다.
   */
  clear(workflowId: string): boolean {
    const workflowCache = this.cache.get(workflowId);
    if (!workflowCache) {
      return false;
    }
    
    workflowCache.clear();
    return true;
  }

  /**
   * 모든 워크플로우의 모든 값을 삭제합니다.
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * 지정된 워크플로우의 모든 키를 가져옵니다.
   */
  keys(workflowId: string): string[] {
    const workflowCache = this.cache.get(workflowId);
    if (!workflowCache) {
      return [];
    }
    
    return Array.from(workflowCache.keys());
  }

  /**
   * 지정된 워크플로우의 모든 값을 가져옵니다.
   */
  values(workflowId: string): T[] {
    const workflowCache = this.cache.get(workflowId);
    if (!workflowCache) {
      return [];
    }
    
    return Array.from(workflowCache.values());
  }

  /**
   * 지정된 워크플로우의 모든 항목을 가져옵니다.
   */
  entries(workflowId: string): [string, T][] {
    const workflowCache = this.cache.get(workflowId);
    if (!workflowCache) {
      return [];
    }
    
    return Array.from(workflowCache.entries());
  }
}

// 인스턴스 내보내기
export const memoryCache = MemoryCache.getInstance(); 