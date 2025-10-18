import { BaseRepository } from '../base-repository';
import type { BusinessPrompt } from '../types/business-prompt';
import type { Prompt } from '../types/prompt';
import { sentry } from '@/features/shared/utils/sentryService';

export class BusinessPromptRepository extends BaseRepository<BusinessPrompt> {
  constructor() {
    super('business_prompts');
  }

  /**
   * Get active prompt by name for a business in ONE query using JOIN
   */
  async getActivePromptByNameForBusiness(businessId: string, promptName: string): Promise<Prompt | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('business_prompts')
        .select('prompts(*)')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .eq('prompts.prompt_name', promptName)
        .single();

      if (error) {
        const errorMessage = `Failed to get prompt data: ${error.message}`;

        // Track error in Sentry
        sentry.trackError(new Error(errorMessage), {
          sessionId: 'repository-call',
          businessId,
          operation: 'get_active_prompt_by_name',
          metadata: {
            promptName,
            errorCode: error.code,
            errorDetails: error.details
          }
        });

        throw new Error(errorMessage);
      }

      return (data as unknown as { prompts: Prompt | null })?.prompts || null;

    } catch (error) {
      // Track unexpected errors
      sentry.trackError(error as Error, {
        sessionId: 'repository-call',
        businessId,
        operation: 'get_active_prompt_by_name',
        metadata: {
          promptName,
          errorType: 'unexpected_error'
        }
      });

      throw error; // Re-throw so caller can handle
    }
  }

  /**
   * Get the active prompt for a business (regardless of prompt name)
   * Each business should have exactly one active prompt
   */
  async getActivePromptForBusiness(businessId: string): Promise<Prompt | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('business_prompts')
        .select('prompts(*)')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .single();

      if (error) {
        const errorMessage = `Failed to get active prompt: ${error.message}`;

        // Track error in Sentry
        sentry.trackError(new Error(errorMessage), {
          sessionId: 'repository-call',
          businessId,
          operation: 'get_active_prompt_for_business',
          metadata: {
            errorCode: error.code,
            errorDetails: error.details
          }
        });

        throw new Error(errorMessage);
      }

      return (data as unknown as { prompts: Prompt | null })?.prompts || null;

    } catch (error) {
      // Track unexpected errors
      sentry.trackError(error as Error, {
        sessionId: 'repository-call',
        businessId,
        operation: 'get_active_prompt_for_business',
        metadata: {
          errorType: 'unexpected_error'
        }
      });

      throw error; // Re-throw so caller can handle
    }
  }
}
