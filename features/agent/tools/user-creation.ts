/**
 * User Creation Service
 *
 * Event-driven user management for voice calls:
 * - Phone number-based user lookup
 * - Automatic customer creation for new callers
 * - Event coordination with context manager
 * - Enterprise dependency injection pattern
 */

import { UserRepository } from '../../shared/lib/database/repositories/user-repository';
import { type VoiceEvent, type CallStartedEvent, type UserResolvedEvent, type VoiceEventBus } from '../memory/redis/event-bus';
import type { User, CreateUserData } from '../../shared/lib/database/types/user';
import type { CreateAuthUserData } from '../../shared/lib/database/types/auth-user';
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


// ============================================================================
// USER CREATION SERVICE
// ============================================================================

export class UserCreationService {
  private readonly userRepository: UserRepository;
  private readonly voiceEventBus: VoiceEventBus;
  private eventListenersInitialized = false;

  constructor(voiceEventBus: VoiceEventBus) {
    this.voiceEventBus = voiceEventBus;
    this.userRepository = new UserRepository();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  initializeEventListeners(): void {
    if (this.eventListenersInitialized) {
      console.log(`⚠️ [UserCreation] Event listeners already initialized - skipping duplicate setup`);
      return;
    }

    console.log(`🔧 [UserCreation] Initializing event listeners`);
    this.setupEventListeners();
    this.eventListenersInitialized = true;
  }

  // ============================================================================
  // EVENT HANDLING (Enterprise Pattern)
  // ============================================================================

  private setupEventListeners(): void {
    console.log('👤 [UserCreation] Setting up service-based event listener');
    this.voiceEventBus.subscribe('voice:events', this.handleAllEvents.bind(this), 'UserCreationService');
    console.log(`🏢 [UserCreation] Subscribed to voice:events stream for: [voice:call:started]`);
  }

  private async handleAllEvents(event: VoiceEvent): Promise<void> {
    console.log(`📨 [UserCreation] Received event: ${event.type} - filtering for relevance`);

    switch (event.type) {
      case 'voice:call:started':
        console.log(`🎯 [UserCreation] Processing relevant event: ${event.type}`);
        await this.processCallStarted(event);
        break;

      default:
        console.log(`⏭️ [UserCreation] Ignoring irrelevant event: ${event.type}`);
        break;
    }
  }

  private async processCallStarted(event: VoiceEvent): Promise<void> {
    const callStartedEvent = event as CallStartedEvent;
    const { phoneNumber, businessId } = callStartedEvent.data;
    const callId = event.callId;

    console.log(`👤 [UserCreation] Processing call started for ${phoneNumber}`);

    try {
      const userResult = await this.resolveUser(phoneNumber, businessId);
      await this.publishUserResolvedEvent(callId, userResult);

      console.log(`✅ [UserCreation] User resolved for ${callId}: ${userResult.isReturningCustomer ? 'returning' : 'new'} customer`);

    } catch (error) {
      console.error(`❌ [UserCreation] Failed to process user lookup for ${callId}:`, error);
      await this.publishUserResolvedEvent(callId, { user: null, isReturningCustomer: false });
    }
  }

  // ============================================================================
  // USER RESOLUTION (Core Business Logic)
  // ============================================================================

  private async resolveUser(phoneNumber: string, businessId: string): Promise<{ user: User | null; isReturningCustomer: boolean }> {
    const lookupResult = await this.performUserLookup(phoneNumber, businessId);

    if (lookupResult.needsCreation) {
      console.log(`👤 [UserCreation] Creating new user for phone: ${phoneNumber}`);
      const newUser = await this.createVoiceCustomer(phoneNumber, businessId);
      return { user: newUser, isReturningCustomer: false };
    }

    return { user: lookupResult.user, isReturningCustomer: lookupResult.isReturningCustomer };
  }

  private async performUserLookup(phoneNumber: string, businessId: string): Promise<UserLookupResult> {
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
      }

      console.log(`👤 [UserCreation] New customer with phone: ${phoneNumber}`);
      return {
        user: null,
        isReturningCustomer: false,
        needsCreation: true,
        phoneNumber
      };

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

  private async createVoiceCustomer(phoneNumber: string, businessId: string): Promise<User> {
    console.log(`👤 [UserCreation] Creating voice customer with auth for phone: ${phoneNumber}`);

    // Use proper CreateAuthUserData type
    const authUserData: CreateAuthUserData = {
      email: `voice-customer-${Date.now()}@temp.local`,
      password: undefined,
      email_confirm: false,
      is_sso_user: false,
      app_metadata: {
        source: 'voice_call',
        phone_number: phoneNumber,
        business_id: businessId
      },
      user_metadata: {
        created_via: 'voice_call',
        original_phone: phoneNumber
      }
    };

    // Use proper CreateUserData type
    const userData: CreateUserData = {
      role: UserRole.CUSTOMER,
      first_name: 'Voice Customer',
      business_id: businessId,
      phone_number: phoneNumber,
      email: null,
      last_name: null
    };

    const newUser = await this.userRepository.createWithAuth(userData, authUserData);
    console.log(`✅ [UserCreation] Created new customer: ${newUser.first_name} (${newUser.phone_number})`);

    // Emit user created event
    await this.voiceEventBus.publish({
      type: 'voice:user:created',
      callId: 'system',
      timestamp: Date.now(),
      data: {
        userId: newUser.id,
        phoneNumber,
        businessId
      }
    });

    return newUser;
  }

  // ============================================================================
  // EVENT PUBLISHING
  // ============================================================================

  private async publishUserResolvedEvent(callId: string, result: { user: User | null; isReturningCustomer: boolean }): Promise<void> {
    const userResolvedEvent: UserResolvedEvent = {
      type: 'voice:user:resolved',
      callId,
      timestamp: Date.now(),
      data: {
        user: result.user as Record<string, unknown> | null,
        isReturningCustomer: result.isReturningCustomer
      }
    };

    await this.voiceEventBus.publish(userResolvedEvent);
  }

  // ============================================================================
  // PUBLIC API (For Direct Usage)
  // ============================================================================

  async lookupUserByPhone(phoneNumber: string, businessId: string): Promise<UserLookupResult> {
    // Delegate to private implementation
    return this.performUserLookup(phoneNumber, businessId);
  }

  // ============================================================================
  // VALIDATION UTILITIES
  // ============================================================================

  validatePhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phoneNumber);
  }

  normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/[\s\-\(\)]/g, '');
  }
}
