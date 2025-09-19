/**
 * Objection Handling Knowledge Tool
 *
 * Provides objection handling guidance from Redis cache
 */

import { voiceRedisClient } from '../../../agent2/sessions/redisClient';
import type { FunctionCallResult } from '../types';

export interface GetObjectionHandlingArgs {
  objection_type: 'price' | 'spouse_approval' | 'service_fit' | 'hesitation' | string;
}

export class ObjectionHandlingTool {
  private readonly callId: string;

  constructor(callId: string) {
    this.callId = callId;
  }

  async getObjectionHandlingGuidance(args: GetObjectionHandlingArgs): Promise<FunctionCallResult> {
    const { objection_type } = args;

    try {
      // Fetch objection handling templates from Redis hash
      const knowledgeKey = `voice:call:${this.callId}:knowledge`;
      const objectionsData = await voiceRedisClient.hget(knowledgeKey, 'objections');

      if (!objectionsData) {
        return {
          success: false,
          message: "I don't have objection handling guidance available right now.",
          data: { error: 'no_objection_data' }
        };
      }

      const objectionHandling = JSON.parse(objectionsData);
      const guidance = objectionHandling[objection_type];

      if (!guidance) {
        // Return general guidance if specific type not found
        return {
          success: true,
          message: "Here's a general approach: Acknowledge their concern, ask clarifying questions, provide reassurance based on their specific situation, and offer a low-pressure next step.",
          data: {
            objection_type,
            guidance_type: 'general',
            available_types: Object.keys(objectionHandling)
          }
        };
      }

      // Format the guidance
      const formattedGuidance = `**Handling ${objection_type} objection:**

1. **Acknowledge:** "${guidance.acknowledge}"
2. **Clarify:** "${guidance.clarify}"
3. **Reframe:** "${guidance.reframe}"
4. **Check agreement:** "${guidance.agreement_check}"
5. **Safe next step:** "${guidance.safe_step}"

Remember: Adapt these to the customer's actual words and situation. Focus on understanding their specific concern.`;

      return {
        success: true,
        message: formattedGuidance,
        data: {
          objection_type,
          guidance,
          formatted_guidance: formattedGuidance
        }
      };

    } catch (error) {
      console.error(`❌ [ObjectionHandlingTool] Error retrieving objection guidance for call ${this.callId}:`, error);
      return {
        success: false,
        message: "I'm having trouble accessing objection handling guidance right now.",
        data: { error: 'redis_retrieval_failed' }
      };
    }
  }
}
