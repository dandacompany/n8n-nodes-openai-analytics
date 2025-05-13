import { IExecuteFunctions } from 'n8n-workflow';
import OpenAI from 'openai';
import { OpenAIApiOptions } from '../types';

export async function initOpenAIClient(functionThis: IExecuteFunctions, i: number): Promise<OpenAI> {
  const openaiOptions: any = {};
  let credentials;
  
  try {
    const authentication = functionThis.getNodeParameter('authentication', i, 'openAIAnalyticsApi') as string;
    
    if (authentication === 'openAIAnalyticsApi') {
      credentials = await functionThis.getCredentials('openAIAnalyticsApi');
      openaiOptions.apiKey = credentials.apiKey as string;
      
      if (credentials.organizationId) {
        openaiOptions.organization = credentials.organizationId as string;
      }
      
      if (credentials.baseUrl) {
        openaiOptions.baseURL = credentials.baseUrl as string;
      } else {
        openaiOptions.baseURL = 'https://api.openai.com/v1';
      }
    } else {
      credentials = await functionThis.getCredentials('openAiApi');
      openaiOptions.apiKey = credentials.apiKey as string;
      
      if (credentials.organization) {
        openaiOptions.organization = credentials.organization as string;
      }
      
      if (credentials.baseUrl) {
        openaiOptions.baseURL = credentials.baseUrl as string;
      } else {
        openaiOptions.baseURL = 'https://api.openai.com/v1';
      }
    }
  } catch (error) {
    // 자격 증명 로드 오류 시 기본값 시도
    try {
      credentials = await functionThis.getCredentials('openAIAnalyticsApi');
      openaiOptions.apiKey = credentials.apiKey as string;
      
      if (credentials.organizationId) {
        openaiOptions.organization = credentials.organizationId as string;
      }
      
      if (credentials.baseUrl) {
        openaiOptions.baseURL = credentials.baseUrl as string;
      } else {
        openaiOptions.baseURL = 'https://api.openai.com/v1';
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      throw new Error('OpenAI API 자격 증명을 로드할 수 없습니다.');
    }
  }
  
  return new OpenAI(openaiOptions);
} 