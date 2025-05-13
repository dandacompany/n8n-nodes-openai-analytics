import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';
import { createThread } from './createThread';
import { addMessage } from './addMessage';
import { runThread } from './runThread';
import { checkRunStatus } from './checkRunStatus';
import { listMessages } from './listMessages';
import { getThread } from './getThread';
import { createAndRunThread } from './createAndRunThread';
import { runExistingThread } from './runExistingThread';

export async function handleThreadOperation(
  operation: string, 
  context: INodeContext
): Promise<INodeExecutionData> {
  switch (operation) {
    case 'create':
      return await createThread(context);
    case 'addMessage':
      return await addMessage(context);
    case 'run':
      return await runThread(context);
    case 'checkRunStatus':
      return await checkRunStatus(context);
    case 'listMessages':
      return await listMessages(context);
    case 'getThread':
      return await getThread(context);
    case 'createAndRunThread':
      return await createAndRunThread(context);
    case 'runExistingThread':
      return await runExistingThread(context);
    default:
      throw new Error(`Unsupported thread operation: ${operation}`);
  }
} 