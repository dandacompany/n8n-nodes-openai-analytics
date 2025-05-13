import { INodeType, ICredentialType } from 'n8n-workflow';

import { OpenAIAnalytics } from './src/nodes/OpenAIAnalytics/OpenAIAnalytics.node';
import { OpenAIAnalyticsApi } from './src/credentials/OpenAIAnalyticsApi.credentials';

// Export the nodes classes 
export const nodeTypes: INodeType[] = [new OpenAIAnalytics()];

// Export the credentials
export const credentialTypes: ICredentialType[] = [new OpenAIAnalyticsApi()]; 