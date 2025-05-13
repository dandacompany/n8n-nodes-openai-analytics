import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function handleReportOperation(
  operation: string, 
  context: INodeContext
): Promise<INodeExecutionData> {
  switch (operation) {
    case 'generateHtmlReport':
      // 임시 구현
      return {
        json: { 
          message: "Report operation 'generateHtmlReport' not fully implemented yet",
          operation
        }
      };
    default:
      throw new Error(`Unsupported report operation: ${operation}`);
  }
}
