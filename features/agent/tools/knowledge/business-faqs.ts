/**
 * General FAQs Knowledge Tool
 *
 * LAST RESORT: For unusual questions not covered by other knowledge functions
 * Only use when services_pricing and business_information don't fit
 */

import { voiceRedisClient } from '../../memory/redis/redis-client';
import type { FunctionCallResult } from '../types';
import type { FrequentQuestion } from '../../../shared/lib/database/types/frequent-questions';

export interface GetGeneralFaqsArgs {
  query?: string; // Optional: filter FAQs by topic
}

export class BusinessFaqsTool {
  private readonly callId: string;

  constructor(callId: string) {
    this.callId = callId;
  }

  async getGeneralFaqs(args: GetGeneralFaqsArgs = {}): Promise<FunctionCallResult> {
    const { query } = args;

    try {
      // Fetch FAQs from Redis hash
      const knowledgeKey = `voice:call:${this.callId}:knowledge`;
      const faqsData = await voiceRedisClient.hget(knowledgeKey, 'faqs');

      if (!faqsData) {
        return {
          success: true,
          message: "I don't have specific FAQs for that question. Let me connect you with someone who can give you the exact details.",
          data: { faqs: [] }
        };
      }

      const frequently_asked_questions: FrequentQuestion[] = JSON.parse(faqsData);

      // Filter FAQs if query provided
      let relevantFaqs = frequently_asked_questions;
      if (query) {
        const searchTerm = query.toLowerCase();
        relevantFaqs = frequently_asked_questions.filter(faq =>
          faq.title.toLowerCase().includes(searchTerm) ||
          faq.content.toLowerCase().includes(searchTerm)
        );
      }

      // Format FAQs for response
      const formattedFaqs = relevantFaqs.map((faq) =>
        `Q: ${faq.title}\nA: ${faq.content}`
      ).join('\n\n');

      const message = relevantFaqs.length > 0
        ? `Here's what I can tell you:\n\n${formattedFaqs}`
        : "I don't have specific information about that, but let me connect you with someone who can help.";

      return {
        success: true,
        message,
        data: {
          faqs: relevantFaqs,
          total_faqs: frequently_asked_questions.length,
          filtered_count: relevantFaqs.length
        }
      };

    } catch (error) {
      console.error(`❌ [BusinessFaqsTool] Error retrieving FAQs for call ${this.callId}:`, error);
      return {
        success: false,
        message: "I'm having trouble accessing that information right now. Let me connect you with someone who can help.",
        data: { error: 'redis_retrieval_failed' }
      };
    }
  }
}
