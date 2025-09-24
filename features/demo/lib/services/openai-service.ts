export class OpenAIService {
  private static instance: OpenAIService;

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  async getEphemeralKey(): Promise<string> {
    console.log('🔑 [OpenAIService] Requesting ephemeral key...');

    const response = await fetch('/api/realtime-session');
    if (!response.ok) {
      throw new Error(`Failed to get ephemeral key: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [OpenAIService] Ephemeral key received');
    return data.value;
  }
}
