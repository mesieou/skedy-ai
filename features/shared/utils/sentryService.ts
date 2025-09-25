/**
 * Simple Sentry Error Tracking Service
 *
 * Clean, extensible error tracking for the voice agent
 * Uses Next.js Sentry integration for consistent frontend/backend tracking
 */

// Use Next.js Sentry integration instead of @sentry/node for consistency
import * as Sentry from '@sentry/nextjs';

interface ErrorContext {
  sessionId: string;
  businessId?: string;
  userId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export class SentryService {
  /**
   * Check if Sentry is available (Next.js handles initialization automatically)
   */
  private static isSentryAvailable(): boolean {
    return typeof Sentry !== 'undefined' && typeof Sentry.captureException === 'function';
  }

  /**
   * Track an error with context
   */
  static trackError(error: Error, context: ErrorContext): void {
    if (!this.isSentryAvailable()) {
      console.warn('⚠️ [Sentry] Not available - falling back to console.error');
      console.error('Error:', error.message, 'Context:', context);
      return;
    }

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
        component: 'voice-agent', // Add component tag
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
    if (!this.isSentryAvailable()) {
      console.warn('⚠️ [Sentry] Not available - falling back to console.log');
      console.log(`[${level.toUpperCase()}] ${message}`, context ? { context } : '');
      return;
    }

    Sentry.withScope((scope) => {
      if (context) {
        scope.setTags({
          sessionId: context.sessionId,
          businessId: context.businessId || 'unknown',
          operation: context.operation || 'unknown',
          component: 'voice-agent',
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
    if (!this.isSentryAvailable()) {
      console.log(`🍞 [Breadcrumb] ${category}: ${message}`, data || '');
      return;
    }

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
  trackError: (error: Error, context: ErrorContext) => SentryService.trackError(error, context),
  trackMessage: (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) =>
    SentryService.trackMessage(message, level, context),
  addBreadcrumb: (message: string, category?: string, data?: Record<string, unknown>) =>
    SentryService.addBreadcrumb(message, category, data),
};

// Sentry is automatically initialized by Next.js via instrumentation.ts
// Just import { sentry } from this file when you need it
