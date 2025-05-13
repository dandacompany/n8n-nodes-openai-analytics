import { INodeExecutionData } from 'n8n-workflow';
import { INodeContext } from '../../types';

export async function runThread(context: INodeContext): Promise<INodeExecutionData> {
  const { openai, functionThis, i } = context;
  
  const threadId = functionThis.getNodeParameter('threadId', i) as string;
  const assistantSelection = functionThis.getNodeParameter('assistantSelection', i) as string;
  let assistantId = '';
  
  if (assistantSelection === 'byId') {
    assistantId = functionThis.getNodeParameter('assistantId', i) as string;
  } else {
    assistantId = functionThis.getNodeParameter('assistantId', i) as string;
  }
  
  const waitForCompletion = functionThis.getNodeParameter('waitForCompletion', i) as boolean;
  const instructions = functionThis.getNodeParameter('instructions', i, '') as string;
  
  // Run the thread
  const runParams: any = {
    assistant_id: assistantId
  };
  
  if (instructions) runParams.instructions = instructions;
  
  const run = await openai.beta.threads.runs.create(threadId, runParams);
  
  if (!waitForCompletion) {
    return {
      json: { ...run as any }
    };
  } else {
    // Poll for completion
    const maxPollTime = functionThis.getNodeParameter('maxPollTime', i, 60) as number;
    const maxEndTime = Date.now() + maxPollTime * 1000;
    
    let runStatus = run;
    while (
      ['in_progress', 'queued', 'requires_action'].includes(runStatus.status) && 
      Date.now() < maxEndTime
    ) {
      // Wait for 1 second between each check
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }
    
    const responseData = { ...runStatus as any };
    
    // If requested, append messages to the response
    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId);
      responseData.messages = messages.data;
    }
    
    return { json: responseData };
  }
} 