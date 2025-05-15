import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';
import { generateHtmlReport } from './generateHtmlReport';

export async function handleReportOperation(
  operation: string, 
  context: INodeContext
): Promise<INodeExecutionData> {
  switch (operation) {
    case 'generateHtmlReport':
      return await generateHtmlReport(context);
    default:
      throw new Error(`Unsupported report operation: ${operation}`);
  }
} 

