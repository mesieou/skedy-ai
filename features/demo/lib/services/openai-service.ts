import * as Sentry from '@sentry/nextjs';

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

    // Add breadcrumb for ephemeral key request
    Sentry.addBreadcrumb({
      message: 'Demo ephemeral key request',
      category: 'demo-openai',
      data: {
        businessCategory: businessCategory || 'default'
      }
    });

    const url = businessCategory ? `/api/realtime-session?category=${businessCategory}` : '/api/realtime-session';
    const response = await fetch(url);
    if (!response.ok) {
      // Track error in Sentry
      Sentry.captureException(new Error(`Failed to get ephemeral key: ${response.status}`), {
        tags: {
          operation: 'demo_ephemeral_key_request',
          businessCategory: businessCategory || 'default'
        },
        extra: {
          httpStatus: response.status,
          httpStatusText: response.statusText
        }
      });

      throw new Error(`Failed to get ephemeral key: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [OpenAIService] Ephemeral key and session received:', {
      hasKey: !!data.value,
      sessionId: data.session?.id,
      businessName: data.session?.businessEntity?.name
    });

    // Add breadcrumb for successful key retrieval
    Sentry.addBreadcrumb({
      message: 'Demo ephemeral key received',
      category: 'demo-openai',
      data: {
        sessionId: data.session?.id || 'unknown',
        businessName: data.session?.businessEntity?.name || 'unknown',
        hasKey: !!data.value
      }
    });

    return data;
  }
}
