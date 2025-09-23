/**
 * Simple Sentry Error Tracking Service
 *
 * Clean, extensible error tracking for the voice agent
 */

import * as Sentry from '@sentry/node';

interface ErrorContext {
  sessionId: string;
  businessId?: string;
  userId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export class SentryService {
  private static initialized = false;

  /**
   * Initialize Sentry (call once at app startup)
   */
  static init(): boolean {
    if (this.initialized) return true;

    if (!process.env.SENTRY_DSN) {
      console.warn('⚠️ [Sentry] SENTRY_DSN not configured - error tracking disabled');
      return false;
    }

    try {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        debug: false, // Disable debug logging to prevent console spam
        beforeSend(event) {
          // Add component tag to all errors
          if (event.exception) {
            event.tags = { ...event.tags, component: 'voice-agent' };
          }
          return event;
        },
      });

      this.initialized = true;
      console.log('✅ [Sentry] Initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ [Sentry] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Track an error with context
   */
  static trackError(error: Error, context: ErrorContext): void {
    if (!this.initialized) return;

    Sentry.withScope((scope) => {
      // Set user context
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      // Set tags for filtering
      scope.setTags({
        sessionId: context.sessionId,
        businessId: context.businessId || 'unknown',
        operation: context.operation || 'unknown',
      });

      // Add extra context
      if (context.metadata) {
        scope.setContext('metadata', context.metadata);
      }

      // Capture the error
      Sentry.captureException(error);
    });
  }

  /**
   * Track a message (for non-error events)
   */
  static trackMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
    if (!this.initialized) return;

    Sentry.withScope((scope) => {
      if (context) {
        scope.setTags({
          sessionId: context.sessionId,
          businessId: context.businessId || 'unknown',
          operation: context.operation || 'unknown',
        });

        if (context.metadata) {
          scope.setContext('metadata', context.metadata);
        }
      }

      Sentry.captureMessage(message, level);
    });
  }

  /**
   * Add breadcrumb for debugging
   */
  static addBreadcrumb(message: string, category: string = 'default', data?: Record<string, unknown>): void {
    if (!this.initialized) return;

    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data,
      timestamp: Date.now() / 1000,
    });
  }
}

// Export a simple interface for common use cases
export const sentry = {
  init: () => SentryService.init(),
  trackError: (error: Error, context: ErrorContext) => SentryService.trackError(error, context),
  trackMessage: (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) =>
    SentryService.trackMessage(message, level, context),
  addBreadcrumb: (message: string, category?: string, data?: Record<string, unknown>) =>
    SentryService.addBreadcrumb(message, category, data),
};

// Sentry is globally initialized in app/layout.tsx
// Just import { sentry } from this file when you need it
