/**
 * Booking Customer Service
 *
 * Domain service for managing booking customers:
 * - Voice call customer creation with auth
 * - Customer lookup and validation for bookings
 * - Business logic for booking customer lifecycle
 */

import { UserRepository } from '../../../shared/lib/database/repositories/user-repository';
import type { User, CreateUserData } from '../../../shared/lib/database/types/user';
import type { CreateAuthUserData } from '../../../shared/lib/database/types/auth-user';
import { UserRole } from '../../../shared/lib/database/types/user';
import { DateUtils } from '../../../shared/utils/date-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface UserCreationInput {
  name: string;
  phone_number: string;
  business_id: string;
}

export interface UserCreationResult {
  user: User;
  isExisting: boolean;
}

// ============================================================================
// USER SERVICE
// ============================================================================

export class CustomerManager {
  private readonly userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Create or find existing user with name and phone number
   */
  async createOrFindUser(input: UserCreationInput): Promise<UserCreationResult> {
    const { phone_number, business_id } = input;

    // Normalize phone number
    const normalizedPhone = DateUtils.normalizePhoneNumber(phone_number);

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      phone_number: normalizedPhone,
      business_id
    });

    if (existingUser) {
      console.log(`👤 [UserService] Found existing user: ${existingUser.first_name} (${existingUser.phone_number})`);
      return {
        user: existingUser,
        isExisting: true
      };
    }

    // Create new user
    const newUser = await this.createNewUser(input);

    return {
      user: newUser,
      isExisting: false
    };
  }

  /**
   * Create a new user with auth (domain logic)
   */
  private async createNewUser(input: UserCreationInput): Promise<User> {
    console.log(`👤 [UserService] Creating new user: ${input.name} (${input.phone_number})`);

    // Use proper CreateAuthUserData type
    const authUserData: CreateAuthUserData = {
      email: `voice-customer-${Date.now()}@temp.local`,
      password: undefined,
      email_confirm: false,
      is_sso_user: false,
      app_metadata: {
        source: 'voice_call',
        phone_number: input.phone_number,
        business_id: input.business_id
      },
      user_metadata: {
        created_via: 'voice_call',
        original_phone: input.phone_number,
        provided_name: input.name
      }
    };

    // Use proper CreateUserData type - mapping from input
    const userData: CreateUserData = {
      role: UserRole.CUSTOMER,
      first_name: input.name.trim(),
      business_id: input.business_id,
      phone_number: DateUtils.normalizePhoneNumber(input.phone_number),
      email: null,
      last_name: null
    };

    const newUser = await this.userRepository.createWithAuth(userData, authUserData);
    console.log(`✅ [UserService] Created new customer: ${newUser.first_name} (${newUser.phone_number})`);

    return newUser;
  }

  /**
   * Validate user input (business logic)
   */
  validateUserInput(input: UserCreationInput): { valid: boolean; message: string } {
    if (!input.name || input.name.trim().length === 0) {
      return { valid: false, message: "Name is required." };
    }

    if (!input.phone_number || input.phone_number.trim().length === 0) {
      return { valid: false, message: "Phone number is required." };
    }

    if (!input.business_id || input.business_id.trim().length === 0) {
      return { valid: false, message: "Business ID is required." };
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(input.phone_number)) {
      return { valid: false, message: "Please provide a valid phone number." };
    }

    return { valid: true, message: "" };
  }
}
