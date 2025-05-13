import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';
import { getFiles } from './getFiles';
import { getFile } from './getFile';
import { uploadFile } from './uploadFile';
import { downloadFile } from './downloadFile';

export async function handleFileOperation(
  operation: string, 
  context: INodeContext
): Promise<INodeExecutionData> {
  switch (operation) {
    case 'getFiles':
      return await getFiles(context);
    case 'getFile':
      return await getFile(context);
    case 'uploadFile':
      return await uploadFile(context);
    case 'downloadFile':
      return await downloadFile(context);
    default:
      throw new Error(`Unsupported file operation: ${operation}`);
  }
} 