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
import type { FunctionCallResult, CheckDayAvailabilityFunctionArgs } from '../types';
import { createToolError } from '../../../shared/utils/error-utils';

export class AvailabilityCheckTool {
  private readonly availabilitySlotsRepository: AvailabilitySlotsRepository;
  private readonly business: Business;

  constructor(business: Business) {
    this.business = business;
    this.availabilitySlotsRepository = new AvailabilitySlotsRepository();
  }

  /**
   * Check availability for a specific date
   */
  async checkDayAvailability(args: CheckDayAvailabilityFunctionArgs): Promise<FunctionCallResult> {
    try {

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

      // Use AvailabilityManager to check the day
      const availabilityManager = new AvailabilityManager(currentAvailabilitySlots, this.business);
      const availabilityResult = availabilityManager.checkDayAvailability(args.date);

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
}
