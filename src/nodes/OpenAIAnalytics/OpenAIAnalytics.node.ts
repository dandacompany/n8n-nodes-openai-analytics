import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeParameters,
} from 'n8n-workflow';

import OpenAI from 'openai';
import { initOpenAIClient } from './helpers/openai';
import { INodeContext } from './types';
import { handleThreadOperation } from './actions/thread';
import { handleAssistantOperation } from './actions/assistant';
import { handleFileOperation } from './actions/file';
import { handleTextOperation } from './actions/text';
import { handleEmbeddingOperation } from './actions/embedding';
import { handleReportOperation } from './actions/report';

// Assistant API에서 사용할 loadOptions 메서드 정의
const loadOptions = {
	// Assistant 목록을 로드하는 메서드
	async getAssistants(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		// OpenAI API 옵션 초기화
		const openaiOptions: any = {};
		let credentials;
		
		try {
			const authentication = this.getNodeParameter('authentication', 'openAIAnalyticsApi') as string;
			
			if (authentication === 'openAIAnalyticsApi') {
				credentials = await this.getCredentials('openAIAnalyticsApi');
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
				credentials = await this.getCredentials('openAiApi');
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
				credentials = await this.getCredentials('openAIAnalyticsApi');
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
				return [{ name: 'Error loading credentials', value: '' }];
			}
		}
		
		const openai = new OpenAI(openaiOptions);
		
		// Assistants 목록 가져오기
		try {
			const assistantsList = await openai.beta.assistants.list({
				limit: 100,
			});
			
			if (!assistantsList.data || assistantsList.data.length === 0) {
				return [{ name: 'No assistants found', value: '' }];
			}
			
			// 이름과 ID를 포함한 옵션 목록 생성
			const options = assistantsList.data.map((assistant) => ({
				name: assistant.name || `Assistant (${assistant.id})`,
				value: assistant.id,
			}));
			
			return options;
		} catch (error) {
			console.error('Error loading assistants:', error);
			return [{ name: 'Error loading assistants', value: '' }];
		}
	},
	
	// 파일 목록을 로드하는 메서드
	async getFiles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const options = this.getNodeParameter('downloadFilePurpose', 'all') as string;
		let purpose: string | undefined;
		
		// 파일 목적에 따라 쿼리 파라미터 설정
		if (options && options !== 'all') {
			purpose = options;
		}
		
		// OpenAI API 클라이언트 초기화
		const openaiCredentials = await this.getCredentials('openAiApi');
		const openaiOptions: any = {
			apiKey: openaiCredentials.apiKey as string,
		};

		// 조직이 설정된 경우 추가
		if (openaiCredentials.organization) {
			openaiOptions.organization = openaiCredentials.organization as string;
		}

		// 기본 URL이 설정된 경우 추가
		if (openaiCredentials.baseURL) {
			openaiOptions.baseURL = openaiCredentials.baseURL as string;
		}

		const openai = new OpenAI(openaiOptions);
		
		try {
			// 파일 목록 가져오기
			const response = await openai.files.list(purpose ? { purpose } : {});
			
			// 옵션 배열로 변환
			return response.data.map((file: any) => ({
				name: `${file.filename} (${file.id})`,
				value: file.id,
				description: `Purpose: ${file.purpose}, Size: ${Math.round(file.bytes / 1024)} KB`,
			}));
		} catch (error) {
			console.error('Error loading files:', error);
			return [{ name: 'Error loading files', value: '' }];
		}
	},
	
	// 임베딩 모델 목록을 로드하는 메서드
	async getEmbeddingModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		// OpenAI API 옵션 초기화
		const openaiOptions: any = {};
		let credentials;
		
		try {
			const authentication = this.getNodeParameter('authentication', 'openAIAnalyticsApi') as string;
			
			if (authentication === 'openAIAnalyticsApi') {
				credentials = await this.getCredentials('openAIAnalyticsApi');
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
				credentials = await this.getCredentials('openAiApi');
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
				credentials = await this.getCredentials('openAIAnalyticsApi');
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
				return [{ name: 'Error loading credentials', value: '' }];
			}
		}
		
		const openai = new OpenAI(openaiOptions);
		
		// 모델 목록 가져오기
		try {
			const modelsList = await openai.models.list();
			
			if (!modelsList.data || modelsList.data.length === 0) {
				return [{ name: 'No models found', value: '' }];
			}
			
			// 임베딩 모델만 필터링
			const embeddingModels = modelsList.data.filter((model) => 
				model.id.includes('embedding') || 
				model.id.includes('embed') || 
				model.id.startsWith('text-embedding')
			);
			
			if (embeddingModels.length === 0) {
				// 임베딩 모델이 없으면 기본 모델 목록 제공
				return [
					{ name: 'text-embedding-3-small', value: 'text-embedding-3-small' },
					{ name: 'text-embedding-3-large', value: 'text-embedding-3-large' },
					{ name: 'text-embedding-ada-002', value: 'text-embedding-ada-002' },
					
				];
			}
			
			// 이름과 ID를 포함한 옵션 목록 생성
			const options = embeddingModels.map((model) => ({
				name: model.id,
				value: model.id,
			}));
			
			return options;
		} catch (error) {
			console.error('Error loading embedding models:', error);
			// 오류 시 기본 임베딩 모델 제공
			return [
				{ name: 'text-embedding-3-small', value: 'text-embedding-3-small' },
				{ name: 'text-embedding-3-large', value: 'text-embedding-3-large' },
				{ name: 'text-embedding-ada-002', value: 'text-embedding-ada-002' },
			];
		}
	},

	// 완성 모델 목록을 로드하는 메서드
	async getCompletionModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		// OpenAI API 옵션 초기화
		const openaiOptions: any = {};
		let credentials;
		
		try {
			const authentication = this.getNodeParameter('authentication', 'openAIAnalyticsApi') as string;
			
			if (authentication === 'openAIAnalyticsApi') {
				credentials = await this.getCredentials('openAIAnalyticsApi');
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
				credentials = await this.getCredentials('openAiApi');
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
				credentials = await this.getCredentials('openAIAnalyticsApi');
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
				return [{ name: 'Error loading credentials', value: '' }];
			}
		}
		
		const openai = new OpenAI(openaiOptions);
		
		// 모델 목록 가져오기
		try {
			const modelsList = await openai.models.list();
			
			if (!modelsList.data || modelsList.data.length === 0) {
				return [{ name: 'No models found', value: '' }];
			}
			
			// 완성 모델 필터링 (GPT 계열)
			const completionModels = modelsList.data.filter((model) => 
				model.id.includes('gpt') && 
				!model.id.includes('embedding') && 
				!model.id.includes('search')
			);
			
			if (completionModels.length === 0) {
				// 완성 모델이 없으면 기본 모델 목록 제공
				return [
					{ name: 'GPT-4.1 (gpt-4-1106-preview)', value: 'gpt-4-1106-preview' },
					{ name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
					{ name: 'GPT-4o', value: 'gpt-4o' },
					{ name: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
					{ name: 'GPT-4', value: 'gpt-4' },
					{ name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
				];
			}
			
			// 이름과 ID를 포함한 옵션 목록 생성
			const options = completionModels.map((model) => ({
				name: model.id,
				value: model.id,
			}));

			// 모델 이름으로 정렬
			options.sort((a, b) => a.name.localeCompare(b.name));

			// 특정 모델들을 리스트의 맨 위로 이동 (우선순위 모델)
			const gpt41 = 'gpt-4-1106-preview';
			const gpt4o = 'gpt-4o';
			const gpt4oMini = 'gpt-4o-mini';
			
			// 특정 모델이 없으면 추가
			const hasGpt41 = options.some(option => option.value === gpt41);
			const hasGpt4o = options.some(option => option.value === gpt4o);
			const hasGpt4oMini = options.some(option => option.value === gpt4oMini);
			
			// 없는 모델 추가
			if (!hasGpt41) options.push({ name: 'GPT-4.1 (gpt-4-1106-preview)', value: gpt41 });
			if (!hasGpt4o) options.push({ name: 'GPT-4o', value: gpt4o });
			if (!hasGpt4oMini) options.push({ name: 'GPT-4o Mini', value: gpt4oMini });
			
			// 우선순위 모델 찾아서 맨 위로 이동
			const priorityModels = [gpt41, gpt4o, gpt4oMini];
			const prioritizedOptions = [];
			
			// 우선순위 모델 순서대로 맨 위로 이동
			for (const modelId of priorityModels) {
				const modelIndex = options.findIndex(option => option.value === modelId);
				if (modelIndex !== -1) {
					// 찾은 모델을 복사
					let modelOption = options.splice(modelIndex, 1)[0];
					
					// GPT-4.1에는 이름 수정
					if (modelId === gpt41 && modelOption.name === gpt41) {
						modelOption = { name: 'GPT-4.1 (gpt-4-1106-preview)', value: gpt41 };
					}
					
					prioritizedOptions.push(modelOption);
				}
			}
			
			// 우선순위 모델과 나머지 모델 합치기
			return [...prioritizedOptions, ...options];
		} catch (error) {
			console.error('Error loading completion models:', error);
			// 오류 시 기본 완성 모델 제공
			return [
				{ name: 'gpt-4o-mini', value: 'gpt-4o-mini' },
				{ name: 'gpt-4o', value: 'gpt-4o' },
				{ name: 'gpt-4', value: 'gpt-4' },
				{ name: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
			];
		}
	},
};

export class OpenAIAnalytics implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenAI Analytics',
		name: 'openAIAnalytics',
		icon: 'file:openai-analytics.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Use OpenAI Analytics API',
		defaults: {
			name: 'OpenAI Analytics',
		},
		inputs: [{
			type: 'main',
		}],
		outputs: [{
			type: 'main',
		}],
		credentials: [
			{
				name: 'openAIAnalyticsApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'openAIAnalyticsApi',
						],
					},
				},
			},
			{
				name: 'openAiApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'openAiApi',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'OpenAI Analytics API',
						value: 'openAIAnalyticsApi',
						description: 'Use dedicated OpenAI Analytics API credentials',
					},
					{
						name: 'OpenAI API',
						value: 'openAiApi',
						description: 'Use existing OpenAI API credentials',
					},
				],
				default: 'openAIAnalyticsApi',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Assistant',
						value: 'assistant',
					},
					{
						name: 'Embedding',
						value: 'embedding',
					},
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Report',
						value: 'report',
					},
					{
						name: 'Text',
						value: 'text',
					},
					{
						name: 'Thread',
						value: 'thread',
					},
				],
				default: 'assistant',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['thread'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new thread',
						action: 'Create a thread',
					},
					{
						name: 'Add Message',
						value: 'addMessage',
						description: 'Add a message to a thread',
						action: 'Add a message to a thread',
					},
					{
						name: 'Run Thread',
						value: 'run',
						description: 'Run a thread',
						action: 'Run a thread',
					},
					{
						name: 'Check Run Status',
						value: 'checkRunStatus',
						description: 'Check the status of a run',
						action: 'Check the status of a run',
					},
					{
						name: 'List Messages',
						value: 'listMessages',
						description: 'Get messages from a thread',
						action: 'Get messages from a thread',
					},
					{
						name: 'Get Thread',
						value: 'getThread',
						description: 'Get a thread by ID',
						action: 'Get a thread',
					},
					{
						name: 'Create and Run Thread',
						value: 'createAndRunThread',
						description: '한 번에 Thread 생성, 메시지 추가, 실행 및 결과 대기',
						action: 'Create run and wait for thread results',
					},
					{
						name: 'Run Existing Thread',
						value: 'runExistingThread',
						description: '기존 Thread에 메시지 추가, 실행 및 결과 대기',
						action: 'Run and wait for existing thread results',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['assistant'],
					},
				},
				options: [
					{
						name: 'Get Assistants',
						value: 'getAssistants',
						description: 'Get a list of assistants',
						action: 'Get a list of assistants',
					},
					{
						name: 'Create Assistant',
						value: 'createAssistant',
						description: 'Create a new assistant',
						action: 'Create a new assistant',
					}
				],
				default: 'getAssistants',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Get Files',
						value: 'getFiles',
						description: 'Get a list of files',
						action: 'Get a list of files',
					},
					{
						name: 'Get File',
						value: 'getFile',
						description: 'Get a file by ID',
						action: 'Get a file',
					},
					{
						name: 'Upload File',
						value: 'uploadFile',
						description: 'Upload a file to OpenAI',
						action: 'Upload a file to OpenAI',
					},
					{
						name: 'Download File',
						value: 'downloadFile',
						description: 'Download content of a file',
						action: 'Download content of a file',
					},
				],
				default: 'getFiles',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['report'],
					},
				},
				options: [
					{
						name: 'Generate HTML Report',
						value: 'generateHtmlReport',
						description: 'Generate an HTML report from text data',
						action: 'Generate HTML report',
					},
				],
				default: 'generateHtmlReport',
			},

			// Thread Create Operation
			{
				displayName: 'Initial Message',
				name: 'initialMessage',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'The initial message to add to the thread (optional)',
				required: false,
			},

			// Thread Add Message Operation
			{
				displayName: 'Thread ID',
				name: 'threadId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['addMessage', 'run', 'checkRunStatus', 'listMessages'],
					},
				},
				default: '',
				description: 'The ID of the thread',
				required: true,
			},
			{
				displayName: 'Message Role',
				name: 'messageRole',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['addMessage'],
					},
				},
				options: [
					{
						name: 'User',
						value: 'user',
						description: 'A message created by the user',
					},
				],
				default: 'user',
				description: 'The role of the entity that is creating the message',
				required: true,
			},
			{
				displayName: 'Message Content',
				name: 'messageContent',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['addMessage'],
					},
				},
				default: '',
				description: 'The content of the message to add to the thread',
				required: true,
			},
			{
				displayName: 'File IDs',
				name: 'fileIds',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['addMessage'],
					},
				},
				default: '',
				description: 'Comma-separated list of file IDs to attach to the message',
				required: false,
			},

			// Thread Run Operation
			{
				displayName: 'Select Assistant',
				name: 'threadAssistantSelection',
				type: 'options',
				options: [
					{
						name: 'From List',
						value: 'fromList',
						description: 'Select an assistant from the list',
					},
					{
						name: 'By ID',
						value: 'byId',
						description: 'Enter the ID of the assistant',
					},
				],
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['run', 'createAndRun'],
					},
				},
				default: 'fromList',
				description: 'How to select the assistant',
				required: true,
			},
			{
				displayName: 'Assistant',
				name: 'threadAssistantId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAssistants',
				},
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['run', 'createAndRun'],
						threadAssistantSelection: ['fromList'],
					},
				},
				default: '',
				description: 'Select the assistant to use for this run',
				required: true,
			},
			{
				displayName: 'Assistant ID',
				name: 'threadAssistantId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['run', 'createAndRun'],
						threadAssistantSelection: ['byId'],
					},
				},
				default: '',
				description: 'The ID of the assistant to use for the run',
				required: true,
			},
			{
				displayName: 'Wait for Completion',
				name: 'threadWaitForCompletion',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['run', 'createAndRun'],
					},
				},
				default: true,
				description: 'Whether to wait for the run to complete before returning',
			},
			{
				displayName: 'Maximum Poll Time (Seconds)',
				name: 'threadMaxPollTime',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['run', 'createAndRun'],
						threadWaitForCompletion: [true],
					},
				},
				default: 120,
				description: 'Maximum time in seconds to wait for the run to complete',
			},
			{
				displayName: 'Instructions',
				name: 'threadInstructions',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['run', 'createAndRun'],
					},
				},
				default: '',
				description: 'Override the default system instructions of the assistant',
				required: false,
			},
			{
				displayName: 'Simplify Output',
				name: 'threadSimplifyOutput',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['run', 'createAndRun'],
					},
				},
				default: true,
				description: 'Whether to return simplified response format',
				hint: '간단한 응답 형식으로 반환할지 여부',
			},

			// Check Run Status Operation
			{
				displayName: 'Run ID',
				name: 'runId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['checkRunStatus'],
					},
				},
				default: '',
				description: 'The ID of the run',
				required: true,
			},

			// Create and Run Thread Operation
			{
				displayName: 'Message Input Method',
				name: 'threadMessageInputMethod',
				type: 'options',
				options: [
					{
						name: 'Single Message',
						value: 'singleMessage',
						description: 'Add only one message',
					},
					{
						name: 'Multiple Messages',
						value: 'multipleMessages',
						description: 'Add multiple messages (can specify role)',
					},
				],
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread'],
					},
				},
				default: 'singleMessage',
				description: 'Select message input method',
				hint: '메시지 입력 방식 선택',
			},
			{
				displayName: 'Initial Message',
				name: 'threadInitialMessage',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread'],
						threadMessageInputMethod: ['singleMessage'],
					},
				},
				default: '',
				description: 'The initial message to add to the thread',
				hint: 'Thread에 추가할 초기 메시지',
				required: true,
			},
			{
				displayName: 'Messages',
				name: 'threadMessages',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread'],
						threadMessageInputMethod: ['multipleMessages'],
					},
				},
				default: {
					values: [
						{
							role: 'user',
							content: '',
						},
					],
				},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Role',
								name: 'role',
								type: 'options',
								options: [
									{
										name: 'User',
										value: 'user',
										description: 'User message',
									},
									{
										name: 'System',
										value: 'system',
										description: 'System message',
									},
								],
								default: 'user',
								description: 'Role of the message author',
								hint: '메시지 작성자의 역할',
							},
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								default: '',
								description: 'Message content',
								hint: '메시지 내용',
								required: true,
							},
						],
					},
				],
				description: 'List of messages to add to the thread',
				hint: 'Thread에 추가할 메시지 목록',
			},
			{
				displayName: 'File Attachment Method',
				name: 'threadFileAttachmentMethod',
				type: 'options',
				options: [
					{
						name: 'Use Existing File IDs',
						value: 'existingFiles',
						description: 'Use file IDs already uploaded to OpenAI',
					},
					{
						name: 'Upload Files from Previous Node',
						value: 'uploadFiles',
						description: 'Upload binary files from previous node',
					},
					{
						name: 'Use Both Methods',
						value: 'both',
						description: 'Use both existing file IDs and upload new files',
					},
					{
						name: 'No File Attachments',
						value: 'none',
						description: 'Do not attach any files',
					},
				],
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread'],
					},
				},
				default: 'none',
				description: 'Select file attachment method',
				hint: '파일을 첨부하는 방식 선택',
			},
			{
				displayName: 'Binary Property',
				name: 'threadBinaryPropertyName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread'],
						threadFileAttachmentMethod: ['uploadFiles', 'both'],
					},
				},
				default: 'data',
				description: 'Binary property containing data from previous node (e.g. "data")',
				hint: '이전 노드에서 전달된 바이너리 데이터를 포함하는 속성 이름 (예: "data")',
				required: true,
			},
			{
				displayName: 'File Purpose',
				name: 'threadUploadFilePurpose',
				type: 'options',
				options: [
					{
						name: 'Assistants',
						value: 'assistants',
						description: 'Files for use with Assistant',
					},
					{
						name: 'Assistants Input',
						value: 'assistants_input',
						description: 'Files for input to Assistant',
					},
				],
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread'],
						threadFileAttachmentMethod: ['uploadFiles', 'both'],
					},
				},
				default: 'assistants',
				description: 'Select purpose for uploaded files',
				hint: '업로드할 파일의 목적 선택',
			},
			{
				displayName: 'Enable File Attachments',
				name: 'threadFileIdsEnabled',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread'],
						threadFileAttachmentMethod: ['existingFiles', 'both'],
					},
				},
				default: true,
				description: 'Whether to attach existing uploaded files',
				hint: '기존 업로드된 파일을 첨부할지 여부',
			},
			{
				displayName: 'File IDs',
				name: 'threadFileIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getFiles',
				},
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread', 'runExistingThread'],
						threadFileAttachmentMethod: ['existingFiles', 'both'],
						threadFileIdsEnabled: [true],
					},
				},
				default: [],
				description: 'File IDs to attach to the thread',
				hint: '스레드에 첨부할 파일 ID',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['report'],
					},
				},
				options: [
					{
						name: 'Generate HTML Report',
						value: 'generateHtmlReport',
						description: 'Generate an HTML report from text data',
						action: 'Generate HTML report',
					},
				],
				default: 'generateHtmlReport',
			},
			{
				displayName: 'Prompt',
				name: 'reportPrompt',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
					rows: 4,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: 'A4용지 1장 짜리 분량으로 모던하고 깔끔한 UI 라이브러리를 사용한 디자인으로 다음 데이터를 분석하고 시각화하는 HTML 보고서를 작성해주세요.',
				description: 'AI에게 보낼 보고서 생성 지시 프롬프트',
				hint: 'AI에게 보낼 보고서 생성 지시 프롬프트',
				required: true,
			},
			{
				displayName: 'Input Text',
				name: 'reportInputText',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
					rows: 5,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: '',
				description: '분석할 텍스트 데이터',
				hint: '보고서로 변환할 텍스트 데이터를 입력하세요',
				required: true,
			},
			{
				displayName: 'OpenAI Model',
				name: 'reportModel',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompletionModels',
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: 'gpt-4.1',
				description: '보고서 생성에 사용할 OpenAI 모델',
				hint: '보고서 생성에 사용할 OpenAI 모델',
				required: true,
			},
			{
				displayName: 'Include Default Libraries',
				name: 'includeDefaultLibraries',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: true,
				description: '부트스트랩, 차트JS 등 기본 UI 라이브러리를 포함합니다',
				hint: '부트스트랩, 차트JS 등 기본 UI 라이브러리를 포함합니다',
			},
			{
				displayName: 'Advanced Settings',
				name: 'advancedSettings',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: false,
				description: '생성 매개변수를 세부 조정합니다',
				hint: '생성 매개변수를 세부 조정합니다',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 2,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
						advancedSettings: [true],
					},
				},
				default: 0.7,
				description: '생성 다양성 조절 (0: 결정적, 2: 매우 창의적)',
				hint: '값이 낮을수록 일관된 결과가, 높을수록 다양한 결과가 생성됩니다',
				required: true,
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				typeOptions: {
					minValue: 1000,
					maxValue: 32000,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
						advancedSettings: [true],
					},
				},
				default: 4096,
				description: '생성할 최대 토큰 수',
				hint: '일반적으로 토큰 한 개는 영어 단어 3/4개 또는 한글 글자 1-2개에 해당합니다',
				required: true,
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
						advancedSettings: [true],
					},
				},
				default: 1,
				description: 'nucleus 샘플링 임계값 (0.1: 상위 10%의 확률만 고려)',
				hint: '톱 P와 온도를 동시에 변경하는 것은 권장되지 않습니다',
				required: false,
			},
			{
				displayName: 'Additional CSS Libraries',
				name: 'extraCssLibraries',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: [],
				description: '추가할 CSS 라이브러리 URL (CDN 링크)',
				hint: '추가할 CSS 라이브러리 URL (CDN 링크)',
			},
			{
				displayName: 'Additional JS Libraries',
				name: 'extraJsLibraries',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: [],
				description: '추가할 JavaScript 라이브러리 URL (CDN 링크)',
				hint: '추가할 JavaScript 라이브러리 URL (CDN 링크)',
			},
			{
				displayName: 'Binary Property',
				name: 'reportBinaryPropertyName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: 'data',
				description: '생성된 HTML을 저장할 바이너리 속성명',
				hint: '생성된 HTML을 저장할 바이너리 속성명',
			},
			{
				displayName: 'File Selection Method',
				name: 'fileSelectionMethod',
				type: 'options',
				options: [
					{
						name: 'Specify by ID',
						value: 'byId',
						description: 'Enter file ID directly',
					},
					{
						name: 'Select from List',
						value: 'fromList',
						description: 'Choose from file list',
					},
				],
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['downloadFile'],
					},
				},
				default: 'byId',
				description: 'Method to select a file',
				hint: '파일 선택 방법',
				required: true,
			},

			// Embedding Create Operation
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['embedding'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create embeddings from text',
						action: 'Create embeddings',
					},
					{
						name: 'Embedding Based Classify',
						value: 'embeddingBasedClassify',
						description: 'Classify text using embeddings similarity',
						action: 'Classify text using embeddings',
					},
					{
						name: 'LLM Based Classify',
						value: 'llmBasedClassify',
						description: 'Classify text using LLM',
						action: 'Classify text using LLM',
					}
				],
				default: 'create',
			},
			
			// Embedding Create Operation
			{
				displayName: 'Model',
				name: 'embeddingModel',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEmbeddingModels',
				},
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['create'],
					},
				},
				default: 'text-embedding-ada-002',
				description: 'The embedding model to use',
				hint: '임베딩에 사용할 모델',
				required: true,
			},
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'Single Text',
						value: 'singleText',
						description: 'A single text string',
					},
					{
						name: 'Multiple Texts',
						value: 'multipleTexts',
						description: 'An array of text strings',
					},
					{
						name: 'JSON Input',
						value: 'jsonInput',
						description: 'JSON string containing an array of texts',
					},
				],
				default: 'singleText',
				description: 'The type of input to embed',
				hint: '임베딩할 입력 유형',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['create'],
						inputType: ['singleText'],
					},
				},
				default: '',
				description: 'The text to embed',
				hint: '임베딩할 텍스트',
				required: true,
			},
			{
				displayName: 'Texts',
				name: 'texts',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['create'],
						inputType: ['multipleTexts'],
					},
				},
				default: [],
				description: 'The texts to embed (comma-separated)',
				hint: '임베딩할 텍스트 목록 (쉼표로 구분)',
				required: true,
			},
			{
				displayName: 'JSON Input',
				name: 'jsonInput',
				type: 'json',
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['create'],
						inputType: ['jsonInput'],
					},
				},
				default: '["Text 1", "Text 2", "Text 3"]',
				description: 'JSON array of texts to embed',
				hint: '임베딩할 텍스트 배열의 JSON 형식',
				required: true,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['create'],
					},
				},
				default: {},
				description: 'Additional options for embedding',
				hint: '임베딩에 대한 추가 옵션',
				options: [
					{
						displayName: 'Dimensions',
						name: 'dimensions',
						type: 'number',
						default: 0,
						description: 'The number of dimensions the resulting output embeddings should have. Only available for certain newer models (e.g. text-embedding-3). If unspecified, the default number of dimensions for the model will be used.',
						hint: '결과 임베딩의 차원 수. 특정 최신 모델에서만 사용 가능 (예: text-embedding-3). 지정하지 않으면 모델의 기본 차원 수가 사용됩니다.',
					},
					{
						displayName: 'Encoding Format',
						name: 'encodingFormat',
						type: 'options',
						options: [
							{
								name: 'Float',
								value: 'float',
							},
							{
								name: 'Base64',
								value: 'base64',
							},
						],
						default: 'float',
						description: 'The format to return the embeddings in',
						hint: '임베딩 결과의 반환 형식',
					},
					{
						displayName: 'User',
						name: 'user',
						type: 'string',
						default: '',
						description: 'A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse',
						hint: '최종 사용자를 나타내는 고유 식별자. OpenAI가 남용을 모니터링하고 감지하는 데 도움이 됩니다',
					},
				],
			},
			// Upload File Operation
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['uploadFile'],
					},
				},
				default: 'data',
				description: 'Binary property containing data from previous node (e.g. "data")',
				hint: '이전 노드에서 전달된 바이너리 데이터를 포함하는 속성 이름 (예: "data")',
				required: true,
			},
			{
				displayName: 'File Purpose',
				name: 'filePurpose',
				type: 'options',
				options: [
					{
						name: 'Assistants',
						value: 'assistants',
						description: 'Files for use with Assistant',
					},
					{
						name: 'Assistants Input',
						value: 'assistants_input',
						description: 'Files for input to Assistant',
					},
					{
						name: 'Fine-Tune',
						value: 'fine-tune',
						description: 'Files for fine-tuning models',
					},
				],
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['uploadFile'],
					},
				},
				default: 'assistants',
				description: 'Select purpose for uploaded files',
				hint: '업로드할 파일의 목적 선택',
				required: true,
			},
			// Parse JSON to Object Operation
			{
				displayName: 'JSON Input',
				name: 'jsonInput',
				type: 'json',
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['parseJson'],
					},
				},
				default: '{"example": "value"}',
					description: 'JSON string to parse into a JavaScript object',
					hint: '자바스크립트 객체로 파싱할 JSON 문자열',
					required: true,
			},
			{
				displayName: 'Use AI Fix',
				name: 'useAiFix',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['parseJson'],
					},
				},
				default: true,
				description: 'Whether to use OpenAI to fix JSON syntax errors',
				hint: 'JSON 구문 오류를 수정하기 위해 OpenAI를 사용할지 여부',
			},
			{
				displayName: 'OpenAI Model',
				name: 'fixModel',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompletionModels',
				},
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['parseJson'],
						useAiFix: [true],
					},
				},
				default: 'gpt-4.1',
				description: 'OpenAI model to use for fixing JSON syntax errors',
				hint: 'JSON 구문 오류를 수정하는 데 사용할 OpenAI 모델',
			},
			{
				displayName: 'Prompt',
				name: 'reportPrompt',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
					rows: 4,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: 'A4용지 1장 짜리 분량으로 모던하고 깔끔한 UI 라이브러리를 사용한 디자인으로 다음 데이터를 분석하고 시각화하는 HTML 보고서를 작성해주세요.',
				description: 'AI에게 보낼 보고서 생성 지시 프롬프트',
				required: true,
			},
			{
				displayName: 'Input Text',
				name: 'reportInputText',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
					rows: 5,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: '',
				description: '분석할 텍스트 데이터',
				hint: '보고서로 변환할 텍스트 데이터를 입력하세요',
				required: true,
			},
			{
				displayName: 'OpenAI Model',
				name: 'reportModel',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompletionModels',
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: 'gpt-4.1',
				description: '보고서 생성에 사용할 OpenAI 모델',
				hint: '보고서 생성에 사용할 OpenAI 모델',
				required: true,
			},
			{
				displayName: 'Include Default Libraries',
				name: 'includeDefaultLibraries',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: true,
				description: '부트스트랩, 차트JS 등 기본 UI 라이브러리를 포함합니다',
				hint: '부트스트랩, 차트JS 등 기본 UI 라이브러리를 포함합니다',
			},
			{
				displayName: 'Advanced Settings',
				name: 'advancedSettings',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: false,
				description: '생성 매개변수를 세부 조정합니다',
				hint: '생성 매개변수를 세부 조정합니다',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 2,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
						advancedSettings: [true],
					},
				},
				default: 0.7,
				description: '생성 다양성 조절 (0: 결정적, 2: 매우 창의적)',
				hint: '값이 낮을수록 일관된 결과가, 높을수록 다양한 결과가 생성됩니다',
				required: true,
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				typeOptions: {
					minValue: 1000,
					maxValue: 32000,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
						advancedSettings: [true],
					},
				},
				default: 4096,
				description: '생성할 최대 토큰 수',
				hint: '일반적으로 토큰 한 개는 영어 단어 3/4개 또는 한글 글자 1-2개에 해당합니다',
				required: true,
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
						advancedSettings: [true],
					},
				},
				default: 1,
				description: 'nucleus 샘플링 임계값 (0.1: 상위 10%의 확률만 고려)',
				hint: '톱 P와 온도를 동시에 변경하는 것은 권장되지 않습니다',
				required: false,
			},
			{
				displayName: 'Additional CSS Libraries',
				name: 'extraCssLibraries',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: [],
				description: '추가할 CSS 라이브러리 URL (CDN 링크)',
				hint: '추가할 CSS 라이브러리 URL (CDN 링크)',
			},
			{
				displayName: 'Additional JS Libraries',
				name: 'extraJsLibraries',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: [],
				description: '추가할 JavaScript 라이브러리 URL (CDN 링크)',
				hint: '추가할 JavaScript 라이브러리 URL (CDN 링크)',
			},
			{
				displayName: 'Binary Property',
				name: 'reportBinaryPropertyName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['generateHtmlReport'],
					},
				},
				default: 'data',
				description: '생성된 HTML을 저장할 바이너리 속성명',
				hint: '생성된 HTML을 저장할 바이너리 속성명',
			},
			{
				displayName: 'File Selection Method',
				name: 'fileSelectionMethod',
				type: 'options',
				options: [
					{
						name: 'Specify by ID',
						value: 'byId',
						description: 'Enter file ID directly',
					},
					{
						name: 'Select from List',
						value: 'fromList',
						description: 'Choose from file list',
					},
				],
				displayOptions: {
					show: {
						resource: ['file'],
						operation: ['downloadFile'],
					},
				},
				default: 'byId',
				description: 'Method to select a file',
				hint: '파일 선택 방법',
				required: true,
			},

			// 임베딩 기반 분류 UI 필드 추가
			{
				displayName: 'Target Text',
				name: 'embeddingTargetText',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['embeddingBasedClassify'],
					},
				},
				default: '',
				description: 'The text to classify using embeddings',
				hint: '임베딩으로 분류할 텍스트',
				required: true,
			},
			{
				displayName: 'Model',
				name: 'embeddingModel',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEmbeddingModels',
				},
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['embeddingBasedClassify'],
					},
				},
				default: 'text-embedding-3-small',
				description: 'The embedding model to use for classification',
				hint: '분류에 사용할 임베딩 모델',
				required: true,
			},
			{
				displayName: 'Categories Mode',
				name: 'embeddingCategoriesMode',
				type: 'options',
				options: [
					{
						name: 'Create New Categories',
						value: 'new',
						description: 'Create and embed new categories',
					},
					{
						name: 'Use Saved Categories',
						value: 'saved',
						description: 'Use previously saved category embeddings',
					},
				],
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['embeddingBasedClassify'],
					},
				},
				default: 'new',
				description: 'Whether to create new categories or use previously saved ones',
				hint: '새 카테고리를 생성하거나 저장된 카테고리를 사용',
			},
			{
				displayName: 'Categories',
				name: 'embeddingCategories',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['embeddingBasedClassify'],
					},
				},
				default: {
					values: [
						{
							category: '',
							embedding: [],
						},
					],
				},
				options: [
					{
							displayName: 'Values',
							name: 'values',
							values: [
								{
									displayName: 'Category',
									name: 'category',
									type: 'string',
									default: '',
									description: 'The category for classification',
									hint: '분류용 카테고리',
									required: true,
								},
								{
									displayName: 'Generate Embedding (Leave Empty to Auto-Generate)',
									name: 'embedding',
									type: 'json',
									default: [],
									typeOptions: {
										rows: 1,
									},
									description: 'Embedding vector for the category (will be auto-generated if empty)',
									hint: '카테고리의 임베딩 벡터 (비어있으면 자동 생성)',
								},
							],
						},
					],
					description: 'Categories for classification with embeddings',
					hint: '임베딩 기반 분류를 위한 카테고리',
			},
			{
				displayName: 'Similarity Threshold',
				name: 'embeddingThreshold',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['embeddingBasedClassify'],
					},
				},
				default: 0.7,
				description: 'Minimum similarity score for classification (0-1)',
				hint: '분류를 위한 최소 유사도 점수 (0-1)',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
				},
			},
			{
				displayName: 'Classification Type',
				name: 'embeddingClassificationType',
				type: 'options',
				options: [
					{
						name: 'Single (Best Match)',
						value: 'single',
						description: 'Only return the best matching category',
					},
					{
						name: 'Multiple (All Above Threshold)',
						value: 'multiple',
						description: 'Return all categories above the threshold',
					},
				],
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['embeddingBasedClassify'],
					},
				},
				default: 'single',
				description: 'Classification method',
				hint: '분류 방식',
			},
			{
				displayName: 'Use Branch Outputs',
				name: 'embeddingUseBranching',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['embeddingBasedClassify'],
					},
				},
				default: true,
				description: 'Whether to enable branching by classification result',
				hint: '분류 결과에 따른 분기 기능 사용 여부',
			},

			// LLM 기반 분류 UI 필드 추가
			{
				displayName: 'Target Text',
				name: 'llmTargetText',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['llmBasedClassify'],
					},
				},
				default: '',
				description: 'The text to classify using LLM',
				hint: 'LLM으로 분류할 텍스트',
				required: true,
			},
			{
				displayName: 'Categories',
				name: 'llmCategories',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['llmBasedClassify'],
					},
				},
				default: {
					values: [
						{
							category: '',
						},
					],
				},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Category',
								name: 'category',
								type: 'string',
								default: '',
								description: 'The category for classification',
								hint: '분류용 카테고리',
								required: true,
							},
						],
					},
				],
				description: 'The categories to use for classification',
				hint: '분류에 사용할 카테고리',
			},
			{
				displayName: 'Model',
				name: 'llmModel',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompletionModels',
				},
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['llmBasedClassify'],
					},
				},
				default: 'gpt-4o-mini',
				description: 'The LLM model to use for classification',
				hint: '분류에 사용할 LLM 모델',
				required: true,
			},
			{
				displayName: 'Response Format',
				name: 'llmResponseFormat',
				type: 'options',
				options: [
					{
						name: 'Text',
						value: 'text',
						description: 'Return only category name as text',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Return structured JSON with category, confidence and reasoning',
					},
				],
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['llmBasedClassify'],
					},
				},
				default: 'json',
				description: 'The format of the LLM response',
				hint: 'LLM 응답 형식',
			},
			{
				displayName: 'Use Branch Outputs',
				name: 'llmUseBranching',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['embedding'],
						operation: ['llmBasedClassify'],
					},
				},
				default: true,
				description: 'Whether to enable branching by classification result',
				hint: '분류 결과에 따른 분기 기능 사용 여부',
			},
			{
				displayName: 'Select Assistant',
				name: 'threadAssistantSelection',
				type: 'options',
				options: [
					{
						name: 'From List',
						value: 'fromList',
						description: 'Select an assistant from the list',
					},
					{
						name: 'By ID',
						value: 'byId',
						description: 'Enter the ID of the assistant',
					},
				],
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread', 'runExistingThread'],
					},
				},
				default: 'fromList',
				description: 'How to select the assistant',
				required: true,
			},
			{
				displayName: 'Assistant',
				name: 'threadAssistantId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAssistants',
				},
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread', 'runExistingThread'],
						threadAssistantSelection: ['fromList'],
					},
				},
				default: '',
				description: 'Select the assistant to use for this run',
				required: true,
			},
			{
				displayName: 'Assistant ID',
				name: 'threadAssistantId',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread', 'runExistingThread'],
						threadAssistantSelection: ['byId'],
					},
				},
				default: '',
				description: 'The ID of the assistant to use for the run',
				required: true,
			},
			{
				displayName: 'Wait for Completion',
				name: 'threadWaitForCompletion',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread'],
					},
				},
				default: true,
				description: 'Whether to wait for the run to complete before returning',
			},
			{
				displayName: 'Maximum Poll Time (Seconds)',
				name: 'threadMaxPollTime',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread'],
						threadWaitForCompletion: [true],
					},
				},
				default: 120,
				description: 'Maximum time in seconds to wait for the run to complete',
			},
			{
				displayName: 'Instructions',
				name: 'threadInstructions',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread'],
					},
				},
				default: '',
				description: 'Override the default system instructions of the assistant',
				required: false,
			},
			{
				displayName: 'Simplify Output',
				name: 'threadSimplifyOutput',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['thread'],
						operation: ['createAndRunThread'],
					},
				},
				default: true,
				description: 'Whether to return simplified response format',
				hint: '간단한 응답 형식으로 반환할지 여부',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['text'],
					},
				},
				options: [
					{
						name: 'Parse JSON',
						value: 'parseJson',
						description: 'Parse JSON string to object with error handling',
						action: 'Parse JSON string to object',
					},
					{
						name: 'Create Embeddings',
						value: 'create',
						description: 'Create embeddings from text',
						action: 'Create embeddings from text',
					},
				],
				default: 'parseJson',
			},
			// Parse JSON to Object Operation
			{
				displayName: 'JSON Input',
				name: 'jsonInput',
				type: 'json',
				displayOptions: {
					show: {
						resource: ['text'],
						operation: ['parseJson'],
					},
				},
				default: '{"example": "value"}',
				description: 'JSON string to parse into a JavaScript object',
				hint: '자바스크립트 객체로 파싱할 JSON 문자열',
				required: true,
			},
			{
				displayName: 'Use AI Fix',
				name: 'useAiFix',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['text'],
						operation: ['parseJson'],
					},
				},
				default: true,
				description: 'Whether to use OpenAI to fix JSON syntax errors',
				hint: 'JSON 구문 오류를 수정하기 위해 OpenAI를 사용할지 여부',
			},
			{
				displayName: 'OpenAI Model',
				name: 'fixModel',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompletionModels',
				},
				displayOptions: {
					show: {
						resource: ['text'],
						operation: ['parseJson'],
						useAiFix: [true],
					},
				},
				default: 'gpt-4o-mini',
				description: 'OpenAI model to use for fixing JSON syntax errors',
				hint: 'JSON 구문 오류를 수정하는 데 사용할 OpenAI 모델',
			},
			// Assistant 생성 작업
			{
				displayName: 'Assistant Name',
				name: 'assistantName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
					},
				},
				default: '',
				description: 'The name of the assistant',
				hint: '어시스턴트의 이름',
				required: true,
			},
			{
				displayName: 'Description',
				name: 'assistantDescription',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
					},
				},
				default: '',
				description: 'The description of the assistant',
				hint: '어시스턴트에 대한 설명',
				required: false,
			},
			{
				displayName: 'System Instructions',
				name: 'assistantInstructions',
				type: 'string',
				typeOptions: {
					rows: 4,
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
					},
				},
				default: '',
				description: 'The system instructions that the assistant uses',
				hint: '어시스턴트가 사용하는 시스템 지시사항',
				required: false,
			},
			{
				displayName: 'Model',
				name: 'assistantModel',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompletionModels',
				},
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
					},
				},
				default: 'gpt-4o',
				description: 'The model used by the assistant',
				hint: '어시스턴트가 사용하는 모델',
				required: true,
			},
			{
				displayName: 'Tools',
				name: 'assistantTools',
				type: 'notice',
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
					},
				},
				default: '',
				description: '어시스턴트가 사용할 도구 선택',
			},
			{
				displayName: 'Use Code Interpreter',
				name: 'useCodeInterpreter',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
					},
				},
				default: false,
				description: 'Whether to use code interpreter',
				hint: '코드 인터프리터 사용 여부',
			},
			{
				displayName: 'Use Retrieval (File Search)',
				name: 'useRetrieval',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
					},
				},
				default: false,
				description: 'Whether to use file retrieval capability',
				hint: '파일 검색 능력 사용 여부',
			},
			{
				displayName: 'Use Function Calling',
				name: 'useFunctionCalling',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
					},
				},
				default: false,
				description: 'Whether to use function calling capability',
				hint: '함수 호출 기능 사용 여부',
			},
			{
				displayName: 'Function Definitions',
				name: 'functionDefinitions',
				type: 'json',
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
						useFunctionCalling: [true],
					},
				},
				default: '[]',
				description: 'JSON array of function definitions',
				hint: '함수 정의 JSON 배열',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Response Format',
				name: 'responseFormatType',
				type: 'options',
				options: [
					{
						name: 'Auto (Default)',
						value: 'auto',
						description: 'Automatically choose the response format',
					},
					{
						name: 'Text',
						value: 'text',
						description: 'Text format response',
					},
					{
						name: 'JSON Object',
						value: 'json_object',
						description: 'JSON Object format response',
					}
				],
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
					},
				},
				default: 'auto',
				description: 'The format that the assistant should use for the response',
				hint: '어시스턴트가 응답에 사용해야 하는 형식',
			},
			{
				displayName: 'Advanced Settings',
				name: 'useAdvancedSettings',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
					},
				},
				default: false,
				description: 'Whether to use advanced generation parameters',
				hint: '고급 생성 매개변수 사용 여부',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 2,
				},
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
						useAdvancedSettings: [true],
					},
				},
				default: 0.7,
				description: 'Controls randomness (0: deterministic, 2: random)',
				hint: '응답의 무작위성을 제어합니다 (0: 결정적, 2: 매우 무작위적)',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
						useAdvancedSettings: [true],
					},
				},
				default: 1,
				description: 'Controls diversity via nucleus sampling',
				hint: '핵 샘플링을 통해 다양성을 제어합니다',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
						useAdvancedSettings: [true],
					},
				},
				default: '{}',
				description: 'Metadata in JSON format',
				hint: 'JSON 형식의 메타데이터',
			},
			{
				displayName: 'Use File Attachments',
				name: 'useFileAttachments',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
					},
				},
				default: false,
				description: 'Whether to attach files to the assistant',
				hint: '어시스턴트에 파일 첨부 여부',
			},
			{
				displayName: 'File IDs',
				name: 'assistantFileIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getFiles',
				},
				displayOptions: {
					show: {
						resource: ['assistant'],
						operation: ['createAssistant'],
						useFileAttachments: [true],
					},
				},
				default: [],
				description: 'File IDs to attach to the assistant',
				hint: '어시스턴트에 첨부할 파일 ID',
			},
		],
	};

	// 모듈 구조와 일치하도록 methods 구조 정의
	methods = {
		loadOptions,
		async generateCategoryEmbedding(this: IExecuteFunctions, index: number, data: INodeParameters, path: string[]): Promise<INodeParameters> {
			// 1. 현재 선택된 임베딩 모델 가져오기
			const embeddingModel = this.getNodeParameter('embeddingModel', 0) as string;
			
			// 2. 현재 카테고리 텍스트 가져오기 
			const categoryText = data.category as string;
			
			if (!categoryText || categoryText.trim() === '') {
				throw new Error('카테고리 텍스트가 비어 있습니다. 임베딩을 생성하려면 카테고리를 입력하세요.');
			}
			
			// 3. OpenAI API 초기화
			const openai = await initOpenAIClient(this, 0);
			
			// 4. 임베딩 생성 요청
			const embeddingResponse = await openai.embeddings.create({
				model: embeddingModel,
				input: categoryText,
			});
			
			// 5. 임베딩 벡터 추출
			const embeddingVector = embeddingResponse.data[0].embedding;
			
			// 6. 결과 반환 (필드 업데이트)
			return {
				...data,
				embedding: embeddingVector,
			};
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		console.log(`[실행] OpenAIAnalytics 노드 실행 시작 - 입력 항목 수: ${items.length}`);

		// Process each item
		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				console.log(`[실행] 항목 ${i} 처리 시작 - resource: ${resource}, operation: ${operation}`);

				// OpenAI API 클라이언트 초기화
				const openai = await initOpenAIClient(this, i);

				// 컨텍스트 객체 생성
				const context: INodeContext = {
					openai,
					functionThis: this,
					items,
					i,
				};

				// 리소스 타입에 따라 적절한 핸들러 호출
				let responseItem: INodeExecutionData;

				switch (resource) {
					case 'thread':
						responseItem = await handleThreadOperation(operation, context);
						break;
					case 'assistant':
						responseItem = await handleAssistantOperation(operation, context);
						break;
					case 'file':
						responseItem = await handleFileOperation(operation, context);
						break;
					case 'text':
						responseItem = await handleTextOperation(operation, context);
						break;
					case 'embedding':
						responseItem = await handleEmbeddingOperation(operation, context);
						break;
					case 'report':
						responseItem = await handleReportOperation(operation, context);
						break;
					default:
						throw new Error(`Unsupported resource: ${resource}`);
				}

				returnData.push(responseItem);
			} catch (error) {
				// 에러 처리
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}




