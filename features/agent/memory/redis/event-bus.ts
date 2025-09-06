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
  private static instance: VoiceEventBus | null = null;
  private subscriptions: Map<string, EventHandler[]> = new Map();
  private channelSubscriptions: Set<string> = new Set(); // Track which channels we've subscribed to
  private isConnected = false;
  private isInitialized = false;
  private instanceId: string;

  private constructor() {
    this.instanceId = 'VoiceEventBus-Singleton';
    console.log(`🏗️ [${this.instanceId}] Creating VoiceEventBus singleton instance`);
    console.log(`🏗️ [${this.instanceId}] Stack trace:`, new Error().stack?.split('\n').slice(1, 5).join('\n'));
    // Don't setup subscriptions immediately - wait for explicit initialization
  }

  static getInstance(): VoiceEventBus {
    if (!VoiceEventBus.instance) {
      VoiceEventBus.instance = new VoiceEventBus();
    }
    return VoiceEventBus.instance;
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
      const channel = this.getChannelForEvent();
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

  async subscribe(eventType: string, handler: EventHandler, subscriberInfo?: string): Promise<void> {
    const subscriber = subscriberInfo || 'Unknown';
    console.log(`🔍 [${this.instanceId}] SUBSCRIPTION REQUEST: ${eventType} by ${subscriber}`);
    console.log(`🔍 [${this.instanceId}] Subscription stack:`, new Error().stack?.split('\n').slice(1, 6).join('\n'));

    // Store handler for this event type
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
      console.log(`🆕 [${this.instanceId}] First handler for event type: ${eventType}`);
    }

    const currentHandlers = this.subscriptions.get(eventType)!;
    currentHandlers.push(handler);

    // Log how many handlers are now registered for this event
    const handlerCount = currentHandlers.length;
    console.log(`📊 [${this.instanceId}] Handler count for ${eventType}: ${handlerCount}`);

    // Subscribe to Redis channel for this event type (only if not already subscribed)
    const channel = this.getChannelForEventType();

    console.log(`🔍 [${this.instanceId}] Checking channel subscription status for: ${channel}`);
    console.log(`🔍 [${this.instanceId}] Current channelSubscriptions:`, Array.from(this.channelSubscriptions));
    console.log(`🔍 [${this.instanceId}] channelSubscriptions.has('${channel}'): ${this.channelSubscriptions.has(channel)}`);

    if (!this.channelSubscriptions.has(channel)) {
      // Fix race condition: Reserve the channel BEFORE async operation (enterprise pattern)
      this.channelSubscriptions.add(channel);
      console.log(`🔒 [${this.instanceId}] Reserved channel '${channel}' to prevent race conditions`);
      console.log(`🔍 [${this.instanceId}] Updated channelSubscriptions:`, Array.from(this.channelSubscriptions));

      console.log(`🔌 [${this.instanceId}] Creating NEW Redis subscription for channel: ${channel}`);
      await this.subscribeToChannel(channel);
      console.log(`📥 [${this.instanceId}] Subscribed to ${eventType} on channel ${channel} by ${subscriber} (${handlerCount} handler${handlerCount > 1 ? 's' : ''})`);
    } else {
      console.log(`♻️ [${this.instanceId}] Using EXISTING Redis subscription for channel: ${channel}`);
      console.log(`📥 [${this.instanceId}] Added handler for ${eventType} (channel ${channel} already subscribed) by ${subscriber} (${handlerCount} handler${handlerCount > 1 ? 's' : ''} total)`);
    }
  }

  async subscribeToCallEvents(callId: string, handler: EventHandler): Promise<void> {
    const channel = `voice:call:${callId}`;
    await voiceRedisClient.subscribe(channel, (message) => {
      this.handleIncomingMessage(message, handler);
    });

    console.log(`📥 [EventBus] Subscribed to call-specific events for ${callId}`);
  }

  /**
   * Subscribe a service to all its relevant events with a single Redis subscription
   * This is the enterprise pattern used by big companies
   */
  async subscribeService(serviceName: string, eventTypes: string[], serviceHandler: (event: VoiceEvent) => Promise<void> | void): Promise<void> {
    console.log(`🏢 [${this.instanceId}] Service-based subscription: ${serviceName} for events: [${eventTypes.join(', ')}]`);

    // Create one Redis subscription for this service
    const serviceChannel = `service:${serviceName}`;

    // Store the service handler
    if (!this.subscriptions.has(serviceChannel)) {
      this.subscriptions.set(serviceChannel, []);
    }
    this.subscriptions.get(serviceChannel)!.push(serviceHandler);

    // Create single Redis subscription for this service
    if (!this.channelSubscriptions.has(serviceChannel)) {
      await voiceRedisClient.subscribe(serviceChannel, (message) => {
        console.log(`📬 [${this.instanceId}] Service message for ${serviceName}`);
        this.handleServiceMessage(message, serviceName, eventTypes);
      });
      this.channelSubscriptions.add(serviceChannel);
      console.log(`✅ [${this.instanceId}] Service ${serviceName} subscribed to ${serviceChannel}`);
    }
  }

  private handleServiceMessage(message: string, serviceName: string, relevantEventTypes: string[]): void {
    try {
      const event: VoiceEvent = JSON.parse(message);

      // Only process if this event type is relevant to this service
      if (relevantEventTypes.includes(event.type)) {
        console.log(`🎯 [${this.instanceId}] Routing ${event.type} to service ${serviceName}`);
        const serviceHandlers = this.subscriptions.get(`service:${serviceName}`) || [];
        serviceHandlers.forEach(handler => {
          this.executeHandler(handler, event);
        });
      } else {
        console.log(`⏭️ [${this.instanceId}] Skipping ${event.type} for service ${serviceName} (not relevant)`);
      }
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Failed to handle service message for ${serviceName}:`, error);
    }
  }

  // ============================================================================
  // INTERNAL METHODS
  // ============================================================================

  private async subscribeToChannel(channel: string): Promise<void> {
    console.log(`🔌 [${this.instanceId}] Creating Redis subscription for channel: ${channel}`);
    await voiceRedisClient.subscribe(channel, (message) => {
      console.log(`📬 [${this.instanceId}] Callback triggered for channel: ${channel}`);
      this.handleIncomingMessage(message);
    });
    console.log(`✅ [${this.instanceId}] Redis subscription created for channel: ${channel}`);
  }

  private async setupSubscriptionHandlers(): Promise<void> {
    // No global pattern subscription needed - we subscribe to specific channels per event type
    console.log('✅ [EventBus] Ready for specific channel subscriptions');
  }

  private handleIncomingMessage(message: string, specificHandler?: EventHandler): void {
    try {
      const event: VoiceEvent = JSON.parse(message);
      console.log(`📨 [${this.instanceId}] Received event: ${event.type} for call ${event.callId}`);

      // Call specific handler if provided
      if (specificHandler) {
        console.log(`🎯 [${this.instanceId}] Using specific handler for ${event.type}`);
        this.executeHandler(specificHandler, event);
        return;
      }

      // For the main voice:events stream, call ALL voice:events handlers (they filter internally)
      const eventChannel = this.getChannelForEvent();
      if (eventChannel === 'voice:events') {
        const handlers = this.subscriptions.get('voice:events') || [];
        console.log(`🎯 [${this.instanceId}] Found ${handlers.length} voice:events handler${handlers.length > 1 ? 's' : ''} for ${event.type}`);
        handlers.forEach((handler, index) => {
          console.log(`🎯 [${this.instanceId}] Executing voice:events handler ${index + 1}/${handlers.length} for ${event.type}`);
          this.executeHandler(handler, event);
        });
      } else {
        // For other channels, use event type matching
        const handlers = this.subscriptions.get(event.type) || [];
        console.log(`🎯 [${this.instanceId}] Found ${handlers.length} handler${handlers.length > 1 ? 's' : ''} for ${event.type}`);
        handlers.forEach((handler, index) => {
          console.log(`🎯 [${this.instanceId}] Executing handler ${index + 1}/${handlers.length} for ${event.type}`);
          this.executeHandler(handler, event);
        });
      }

    } catch (error) {
      console.error(`❌ [${this.instanceId}] Failed to parse incoming message:`, error);
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

  private getChannelForEvent(): string {
    // ALL events go to the main voice events stream (Netflix/Kafka pattern)
    // Services filter internally for what they need
    return 'voice:events';
  }

  private getChannelForEventType(): string {
    // ALL event types go to the main voice events stream (Netflix/Kafka pattern)
    return 'voice:events';
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

// Factory function for dependency injection
export function createVoiceEventBus(): VoiceEventBus {
  return VoiceEventBus.getInstance();
}
