/**
 * Redis Event Bus
 *
 * Event-driven communication for voice agent services using Redis Pub/Sub:
 * - Decouples services for better scalability
 * - Enables real-time coordination between components
 * - Production-ready with error handling and reconnection
 */

import { voiceRedisClient } from './redis-client';

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface VoiceEvent {
  type: string;
  callId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export type EventHandler = (event: VoiceEvent) => Promise<void> | void;

// Event type definitions for type safety
export interface CallStartedEvent extends VoiceEvent {
  type: 'voice:call:started';
  data: {
    phoneNumber: string;
    businessId: string;
    twilioAccountSid: string;
  };
}

export interface UserResolvedEvent extends VoiceEvent {
  type: 'voice:user:resolved';
  data: {
    user: Record<string, unknown> | null; // User object or null for new customer
    isReturningCustomer: boolean;
  };
}

export interface MessageReceivedEvent extends VoiceEvent {
  type: 'voice:message:user' | 'voice:message:assistant' | 'voice:message:system';
  data: {
    content: string;
    openai_item_id?: string;
  };
}

export interface CallEndedEvent extends VoiceEvent {
  type: 'voice:call:ended';
  data: {
    reason: string;
    duration: number;
  };
}

// ============================================================================
// EVENT BUS CLASS
// ============================================================================

export class VoiceEventBus {
  private subscriptions: Map<string, EventHandler[]> = new Map();
  private channelSubscriptions: Set<string> = new Set(); // Track which channels we've subscribed to
  private isConnected = false;
  private isInitialized = false;

  constructor() {
    // Don't setup subscriptions immediately - wait for explicit initialization
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure Redis is connected before setting up subscriptions
      await voiceRedisClient.connect();
      await this.setupSubscriptionHandlers();
      this.isInitialized = true;
      console.log('✅ [EventBus] Initialized successfully');
    } catch (error) {
      console.error('❌ [EventBus] Failed to initialize:', error);
      throw error;
    }
  }

  // ============================================================================
  // PUBLISHING
  // ============================================================================

  async publish(event: VoiceEvent): Promise<void> {
    try {
      const channel = this.getChannelForEvent(event);
      const message = JSON.stringify(event);

      const subscriberCount = await voiceRedisClient.publish(channel, message);
      console.log(`📤 [EventBus] Published ${event.type} to ${subscriberCount} subscribers`);

    } catch (error) {
      console.error(`❌ [EventBus] Failed to publish event ${event.type}:`, error);
      // Don't throw - voice calls should continue even if events fail
    }
  }

  // ============================================================================
  // SUBSCRIBING
  // ============================================================================

  async subscribe(eventType: string, handler: EventHandler): Promise<void> {
    // Store handler for this event type
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType)!.push(handler);

    // Subscribe to Redis channel for this event type (only if not already subscribed)
    const channel = this.getChannelForEventType(eventType);
    if (!this.channelSubscriptions.has(channel)) {
      await this.subscribeToChannel(channel);
      this.channelSubscriptions.add(channel);
      console.log(`📥 [EventBus] Subscribed to ${eventType} on channel ${channel}`);
    } else {
      console.log(`📥 [EventBus] Added handler for ${eventType} (channel ${channel} already subscribed)`);
    }
  }

  async subscribeToCallEvents(callId: string, handler: EventHandler): Promise<void> {
    const channel = `voice:call:${callId}`;
    await voiceRedisClient.subscribe(channel, (message) => {
      this.handleIncomingMessage(message, handler);
    });

    console.log(`📥 [EventBus] Subscribed to call-specific events for ${callId}`);
  }

  // ============================================================================
  // INTERNAL METHODS
  // ============================================================================

  private async subscribeToChannel(channel: string): Promise<void> {
    await voiceRedisClient.subscribe(channel, (message) => {
      this.handleIncomingMessage(message);
    });
  }

  private async setupSubscriptionHandlers(): Promise<void> {
    // No global pattern subscription needed - we subscribe to specific channels per event type
    console.log('✅ [EventBus] Ready for specific channel subscriptions');
  }

  private handleIncomingMessage(message: string, specificHandler?: EventHandler): void {
    try {
      const event: VoiceEvent = JSON.parse(message);
      console.log(`📨 [EventBus] Received event: ${event.type} for call ${event.callId}`);

      // Call specific handler if provided
      if (specificHandler) {
        this.executeHandler(specificHandler, event);
        return;
      }

      // Call registered handlers for this event type
      const handlers = this.subscriptions.get(event.type) || [];
      handlers.forEach(handler => {
        this.executeHandler(handler, event);
      });

    } catch (error) {
      console.error('❌ [EventBus] Failed to parse incoming message:', error);
    }
  }

  private executeHandler(handler: EventHandler, event: VoiceEvent): void {
    try {
      const result = handler(event);
      if (result instanceof Promise) {
        result.catch(error => {
          console.error(`❌ [EventBus] Event handler failed for ${event.type}:`, error);
        });
      }
    } catch (error) {
      console.error(`❌ [EventBus] Event handler failed for ${event.type}:`, error);
    }
  }

  private getChannelForEvent(event: VoiceEvent): string {
    // Call-specific events go to call-specific channels
    if (event.type.includes('call:') || event.type.includes('message:')) {
      return `voice:call:${event.callId}`;
    }

    // Global events go to global channel
    return 'voice:global';
  }

  private getChannelForEventType(eventType: string): string {
    if (eventType.includes('call:') || eventType.includes('message:')) {
      return 'voice:call:*'; // Pattern subscription
    }
    return 'voice:global';
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  createEvent(type: string, callId: string, data: Record<string, unknown>): VoiceEvent {
    return {
      type,
      callId,
      timestamp: Date.now(),
      data
    };
  }

  async getSubscriberCount(): Promise<number> {
    // Redis doesn't provide direct subscriber count, but we can use PUBSUB NUMSUB
    return 0; // Placeholder - implement if needed
  }
}

// Singleton instance - initialize explicitly when needed
export const voiceEventBus = new VoiceEventBus();
