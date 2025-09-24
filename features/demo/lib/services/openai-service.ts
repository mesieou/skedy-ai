export class OpenAIService {
  private static instance: OpenAIService;

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  async getEphemeralKey(businessCategory?: string): Promise<{value: string, session: Record<string, unknown>}> {
    console.log('🔑 [OpenAIService] Requesting ephemeral key...', { businessCategory });

    const url = businessCategory ? `/api/realtime-session?category=${businessCategory}` : '/api/realtime-session';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get ephemeral key: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [OpenAIService] Ephemeral key and session received:', {
      hasKey: !!data.value,
      sessionId: data.session?.id,
      businessName: data.session?.businessEntity?.name
    });
    return data;
  }
}
