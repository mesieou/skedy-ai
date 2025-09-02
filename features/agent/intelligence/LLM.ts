import { GoogleGenerativeAI } from '@google/generative-ai';

export async function createLLMCommunication(prompt: string): Promise<string> {
  try {
    // Check if API key exists
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
    }

    console.log('🤖 Initializing Google AI...');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    console.log('🤖 Generating content with prompt length:', prompt.length);
    const result = await model.generateContent(prompt);
    const response = await result.response;

    const text = response.text();
    console.log('✅ LLM response generated, length:', text.length);
    return text;
  } catch (error) {
    console.error('❌ LLM Error Details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      hasApiKey: !!process.env.GOOGLE_AI_API_KEY,
      apiKeyLength: process.env.GOOGLE_AI_API_KEY?.length || 0
    });
    throw error; // Re-throw to be caught by handleConversation
  }
}
