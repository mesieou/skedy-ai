/**
 * User Creation Service
 *
 * Event-driven user management for voice calls:
 * - Phone number-based user lookup
 * - Automatic customer creation for new callers
 * - Event coordination with context manager
 * - Reusable for future web agent
 */

import { UserRepository } from '../../shared/lib/database/repositories/user-repository';
import { voiceEventBus, type VoiceEvent, type CallStartedEvent, type UserResolvedEvent } from '../memory/redis/event-bus';
import type { User, CreateUserData } from '../../shared/lib/database/types/user';
import { UserRole } from '../../shared/lib/database/types/user';

// ============================================================================
// TYPES
// ============================================================================

export interface UserLookupResult {
  user: User | null;
  isReturningCustomer: boolean;
  needsCreation: boolean;
  phoneNumber: string;
}

export interface CustomerCreationData {
  phoneNumber: string;
  businessId: string;
  name?: string;
  email?: string;
}

// ============================================================================
// USER CREATION SERVICE
// ============================================================================

export class UserCreationService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
    // Don't setup event listeners in constructor - will be done by service container
  }

  // Initialize event listeners (called once by service container)
  initializeEventListeners(): void {
    this.setupEventListeners();
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private setupEventListeners(): void {
    // Listen for call started events to trigger user lookup
    voiceEventBus.subscribe('voice:call:started', this.handleCallStarted.bind(this), 'UserCreationService');

    console.log('👤 [UserCreation] Event listeners initialized');
  }

  private async handleCallStarted(event: VoiceEvent): Promise<void> {
    const callStartedEvent = event as CallStartedEvent;
    const { phoneNumber, businessId } = callStartedEvent.data;
    const callId = event.callId;

    console.log(`👤 [UserCreation] Processing call started for ${phoneNumber}`);

    try {
      const userLookupResult = await this.lookupUserByPhone(phoneNumber, businessId);

      // Emit user resolved event
      const userResolvedEvent: UserResolvedEvent = {
        type: 'voice:user:resolved',
        callId,
        timestamp: Date.now(),
        data: {
          user: userLookupResult.user as Record<string, unknown> | null,
          isReturningCustomer: userLookupResult.isReturningCustomer
        }
      };

      await voiceEventBus.publish(userResolvedEvent);

      console.log(`✅ [UserCreation] User resolved for ${callId}: ${userLookupResult.isReturningCustomer ? 'returning' : 'new'} customer`);

    } catch (error) {
      console.error(`❌ [UserCreation] Failed to process user lookup for ${callId}:`, error);

      // Emit user resolved with null user (new customer)
      await voiceEventBus.publish({
        type: 'voice:user:resolved',
        callId,
        timestamp: Date.now(),
        data: {
          user: null,
          isReturningCustomer: false
        }
      });
    }
  }

  // ============================================================================
  // USER LOOKUP & CREATION
  // ============================================================================

  async lookupUserByPhone(phoneNumber: string, businessId: string): Promise<UserLookupResult> {
    try {
      console.log(`👤 [UserCreation] Looking up user: ${phoneNumber} for business ${businessId}`);

      const existingUser = await this.userRepository.findOne({
        phone_number: phoneNumber,
        business_id: businessId
      });

      if (existingUser) {
        console.log(`👤 [UserCreation] Found existing customer: ${existingUser.first_name} (${existingUser.phone_number})`);

        return {
          user: existingUser,
          isReturningCustomer: true,
          needsCreation: false,
          phoneNumber
        };
      } else {
        console.log(`👤 [UserCreation] New customer with phone: ${phoneNumber}`);

        return {
          user: null,
          isReturningCustomer: false,
          needsCreation: true,
          phoneNumber
        };
      }

    } catch (error) {
      console.error(`❌ [UserCreation] Error looking up user by phone ${phoneNumber}:`, error);

      // Return as new customer on error
      return {
        user: null,
        isReturningCustomer: false,
        needsCreation: true,
        phoneNumber
      };
    }
  }

  async createVoiceCustomer(customerData: CustomerCreationData): Promise<User> {
    const userData: CreateUserData = {
      role: UserRole.CUSTOMER,
      first_name: customerData.name || 'Voice Customer',
      business_id: customerData.businessId,
      phone_number: customerData.phoneNumber,
      email: customerData.email || null,
      last_name: null
    };

    try {
      const newUser = await this.userRepository.create(userData);
      console.log(`✅ [UserCreation] Created new customer: ${newUser.first_name} (${newUser.phone_number})`);

      // Emit user created event
      await voiceEventBus.publish({
        type: 'voice:user:created',
        callId: '', // Will be set by caller
        timestamp: Date.now(),
        data: {
          user: newUser,
          customerData
        }
      });

      return newUser;

    } catch (error) {
      console.error(`❌ [UserCreation] Failed to create customer:`, error);
      throw error;
    }
  }


  // ============================================================================
  // VALIDATION
  // ============================================================================

  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation (can be enhanced)
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phoneNumber);
  }

  normalizePhoneNumber(phoneNumber: string): string {
    // Remove formatting and normalize
    return phoneNumber.replace(/[\s\-\(\)]/g, '');
  }
}
