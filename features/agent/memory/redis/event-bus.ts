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


export interface UserCreatedEvent extends VoiceEvent {
  type: 'voice:user:created';
  data: {
    user_id: string;
    user_data: Record<string, unknown>; // User object
  };
}

// Removed MessageReceivedEvent - messages are now stored directly without events

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

      await voiceRedisClient.publish(channel, message);

    } catch (error) {
      console.error(`❌ [EventBus] Failed to publish event ${event.type}:`, error);
      // Don't throw - voice calls should continue even if events fail
    }
  }

  // ============================================================================
  // SUBSCRIBING
  // ============================================================================

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async subscribe(eventType: string, handler: EventHandler, _subscriberInfo?: string): Promise<void> {
    // Store handler for this event type
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const currentHandlers = this.subscriptions.get(eventType)!;
    currentHandlers.push(handler);

    // Subscribe to Redis channel for this event type (only if not already subscribed)
    const channel = this.getChannelForEventType();

    if (!this.channelSubscriptions.has(channel)) {
      // Fix race condition: Reserve the channel BEFORE async operation
      this.channelSubscriptions.add(channel);
      await this.subscribeToChannel(channel);
    }
  }

  async subscribeToCallEvents(callId: string, handler: EventHandler): Promise<void> {
    const channel = `voice:call:${callId}`;
    await voiceRedisClient.subscribe(channel, (message) => {
      this.handleIncomingMessage(message, handler);
    });

  }

  /**
   * Subscribe a service to all its relevant events with a single Redis subscription
   * This is the enterprise pattern used by big companies
   */
  async subscribeService(serviceName: string, eventTypes: string[], serviceHandler: (event: VoiceEvent) => Promise<void> | void): Promise<void> {
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
        this.handleServiceMessage(message, serviceName, eventTypes);
      });
      this.channelSubscriptions.add(serviceChannel);
    }
  }

  private handleServiceMessage(message: string, serviceName: string, relevantEventTypes: string[]): void {
    try {
      const event: VoiceEvent = JSON.parse(message);

      // Only process if this event type is relevant to this service
      if (relevantEventTypes.includes(event.type)) {
        const serviceHandlers = this.subscriptions.get(`service:${serviceName}`) || [];
        serviceHandlers.forEach(handler => {
          this.executeHandler(handler, event);
        });
      }
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Failed to handle service message for ${serviceName}:`, error);
    }
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
  }

  private handleIncomingMessage(message: string, specificHandler?: EventHandler): void {
    try {
      const event: VoiceEvent = JSON.parse(message);

      // Call specific handler if provided
      if (specificHandler) {
        this.executeHandler(specificHandler, event);
        return;
      }

      // For the main voice:events stream, call ALL voice:events handlers (they filter internally)
      const eventChannel = this.getChannelForEvent();
      if (eventChannel === 'voice:events') {
        const handlers = this.subscriptions.get('voice:events') || [];
        handlers.forEach((handler) => {
          this.executeHandler(handler, event);
        });
      } else {
        // For other channels, use event type matching
        const handlers = this.subscriptions.get(event.type) || [];
        handlers.forEach((handler) => {
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
