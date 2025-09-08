/**
 * Availability Check Tool
 *
 * Domain service for checking availability:
 * - Handles all availability checking logic
 * - Manages repository access
 * - Formats responses for AI consumption
 */

import { AvailabilitySlotsRepository } from '../../../shared/lib/database/repositories/availability-slots-repository';
import { AvailabilityManager } from '../../../scheduling/lib/availability/availability-manager';
import type { Business } from '../../../shared/lib/database/types/business';
import type { Service } from '../../../shared/lib/database/types/service';
import type { CallContextManager } from '../../memory/call-context-manager';
import type { FunctionCallResult, CheckDayAvailabilityFunctionArgs } from '../types';
import { createToolError } from '../../../shared/utils/error-utils';

export class AvailabilityCheckTool {
  private readonly availabilitySlotsRepository: AvailabilitySlotsRepository;
  private readonly business: Business;
  private readonly callContextManager: CallContextManager;

  constructor(business: Business, callContextManager: CallContextManager) {
    this.business = business;
    this.callContextManager = callContextManager;
    this.availabilitySlotsRepository = new AvailabilitySlotsRepository();
  }

  /**
   * Check availability for a specific date
   */
  async checkDayAvailability(args: CheckDayAvailabilityFunctionArgs, callId: string): Promise<FunctionCallResult> {
    try {
      // Get actual quote duration from call context (includes travel time)
      const selectedQuote = await this.callContextManager.getSelectedQuoteData(callId);
      const serviceDuration = selectedQuote?.quoteResultData.total_estimate_time_in_minutes;

      console.log(`📅 [AvailabilityCheck] Using quote duration: ${serviceDuration || 'default'} minutes`);

      // Get current availability slots for the business
      const currentAvailabilitySlots = await this.availabilitySlotsRepository.findOne({
        business_id: this.business.id
      });

      if (!currentAvailabilitySlots) {
        return createToolError(
          "No availability data",
          "Sorry, I don't have availability information right now. Please contact us directly."
        );
      }

      // Use AvailabilityManager to check the day with service duration
      const availabilityManager = new AvailabilityManager(currentAvailabilitySlots, this.business);
      const availabilityResult = availabilityManager.checkDayAvailability(args.date, serviceDuration);

      if (!availabilityResult.success) {
        return createToolError(
          "Availability check failed",
          availabilityResult.formattedMessage
        );
      }

      return {
        success: true,
        data: {
          date: availabilityResult.date,
          available_slots: availabilityResult.availableSlots,
          slot_count: availabilityResult.availableSlots.length
        },
        message: availabilityResult.formattedMessage
      };

    } catch (error) {
      console.error('❌ [AvailabilityCheckTool] Availability check failed:', error);
      return createToolError(
        "Availability check failed",
        "Sorry, I couldn't check availability right now. Please try again."
      );
    }
  }

  /**
   * Estimate service duration from selected service (reuse existing logic)
   */
  private estimateServiceDuration(service: Service): number {
    // Use the first duration estimate from job scope options as default
    const firstComponent = service.pricing_config?.components?.[0];
    const firstTier = firstComponent?.tiers?.[0];
    const durationEstimates = firstTier?.duration_estimate_mins;

    if (durationEstimates && typeof durationEstimates === 'object') {
      // Get first duration estimate (e.g., "few_items": 60)
      const firstDuration = Object.values(durationEstimates)[0];
      return typeof firstDuration === 'number' ? firstDuration : 60;
    }

    return 60; // Default fallback
  }
}
