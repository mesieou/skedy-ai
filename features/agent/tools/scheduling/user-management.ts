/**
 * User Management Tool (Agent Layer)
 *
 * Thin orchestrator for AI user interactions:
 * - Agent-specific input validation
 * - AI-friendly response formatting
 * - Delegates domain logic to UserService
 */

import { CustomerManager } from '../../../scheduling/lib/bookings/customer-manager';
import { UserRepository } from '../../../shared/lib/database/repositories/user-repository';
import type { FunctionCallResult } from '../types';
import { createToolError } from '../../../shared/utils/error-utils';
import { DateUtils } from '../../../shared/utils/date-utils';
import { type CallContextManager } from '../../memory';

// Import the shared type instead of duplicating it
import type { CreateUserFunctionArgs } from '../types';

// ============================================================================
// USER MANAGEMENT TOOL
// ============================================================================

export class UserManagementTool {
  private readonly customerManager: CustomerManager;
  private readonly userRepository: UserRepository;
  private readonly callContextManager: CallContextManager | null = null;

  constructor(callContextManager?: CallContextManager) {
    this.customerManager = new CustomerManager();
    this.userRepository = new UserRepository();
    this.callContextManager = callContextManager || null;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Check if user exists by phone number (AI-specific orchestration)
   */
  async checkUserExists(phoneNumber: string, businessId: string): Promise<FunctionCallResult> {
    try {

      // Use repository directly - simple and clean
      const normalizedPhone = DateUtils.normalizePhoneNumber(phoneNumber);
      const existingUser = await this.userRepository.findOne({
        phone_number: normalizedPhone,
        business_id: businessId
      });

      if (existingUser) {
        return {
          success: true,
          data: {
            user_id: existingUser.id,
            name: existingUser.first_name || '',
            phone_number: existingUser.phone_number || '',
            status: 'existing'
          },
          message: `Welcome back, ${existingUser.first_name || 'there'}! I have your details on file.`
        };
      } else {
        return {
          success: false,
          message: "I don't have your details yet. Can I get your name for the booking?"
        };
      }

    } catch (error) {
      console.error('❌ [UserManagementTool] User lookup failed:', error);
      return createToolError(
        "User lookup failed",
        "Can I get your name for the booking?"
      );
    }
  }

  /**
   * Create a new user - thin orchestrator for AI interactions
   */
  async createUser(args: CreateUserFunctionArgs, businessId: string, callId?: string): Promise<FunctionCallResult> {
    try {
      // Agent-specific input validation
      const validation = this.validateUserInput(args);
      if (!validation.valid) {
        return createToolError("Invalid user information", validation.message);
      }

      // Delegate to domain service - it handles existing vs new users
      const result = await this.customerManager.createOrFindUser({
        name: args.name,
        phone_number: args.phone_number,
        business_id: businessId
      });


      // Update call context with user information (integrate with Redis)
      if (callId && this.callContextManager) {
        await this.callContextManager.updateUserContext(callId, result.user);
      }

      // Format AI-friendly response
      return {
        success: true,
        data: {
          user_id: result.user.id,
          name: result.user.first_name || '',
          phone_number: result.user.phone_number || '',
          status: result.isExisting ? 'existing' : 'created'
        },
        message: result.isExisting
          ? `Great! I found your details in our system, ${result.user.first_name || 'there'}.`
          : `Perfect! I've got your details, ${result.user.first_name || 'there'}. Let me get that booking sorted for you.`
      };

    } catch (error) {
      console.error('❌ [UserManagementTool] User creation failed:', error);
      return createToolError(
        "User creation failed",
        "Sorry, I couldn't save your details right now. Please try again."
      );
    }
  }


  // ============================================================================
  // AGENT-SPECIFIC VALIDATION
  // ============================================================================

  /**
   * Validate AI function arguments (agent-specific validation only)
   */
  private validateUserInput(args: CreateUserFunctionArgs): { valid: boolean; message: string } {
    // Simple agent-level validation
    if (!args.name || args.name.trim().length === 0) {
      return { valid: false, message: "Name is required." };
    }

    if (!args.phone_number || args.phone_number.trim().length === 0) {
      return { valid: false, message: "Phone number is required." };
    }

    return { valid: true, message: "" };
  }
}
