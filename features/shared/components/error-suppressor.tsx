"use client";

import { useEffect } from 'react';

/**
 * ErrorSuppressor - Suppresses known non-critical console errors
 * 
 * This component filters out specific console errors that are:
 * - Coming from external services (like MCP server)
 * - Non-critical/cosmetic
 * - Not affecting application functionality
 */
export function ErrorSuppressor() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;

    // List of error patterns to suppress
    const suppressPatterns = [
      'Unable to add filesystem',
      '<illegal path>',
    ];

    // Override console.error
    console.error = (...args: unknown[]) => {
      const message = args[0]?.toString() || '';
      
      // Check if message matches any suppress pattern
      const shouldSuppress = suppressPatterns.some(pattern => 
        message.includes(pattern)
      );

      if (shouldSuppress) {
        // Log to a separate debug channel if needed
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Suppressed Error]:', message);
        }
        return;
      }

      // Call original error for non-suppressed messages
      originalError.apply(console, args);
    };

    // Override console.warn (optional)
    console.warn = (...args: unknown[]) => {
      const message = args[0]?.toString() || '';
      
      const shouldSuppress = suppressPatterns.some(pattern => 
        message.includes(pattern)
      );

      if (shouldSuppress) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Suppressed Warning]:', message);
        }
        return;
      }

      originalWarn.apply(console, args);
    };

    // Cleanup: restore original methods on unmount
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // This component doesn't render anything
  return null;
}
