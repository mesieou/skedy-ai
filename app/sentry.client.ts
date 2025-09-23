/**
 * Client-side Sentry Initialization
 *
 * For client-side error tracking, use @sentry/browser instead of the server sentryService
 */

// TODO: Implement proper client-side Sentry with @sentry/browser
// For now, disable client-side Sentry to fix build issues

console.log('🎯 [App] Client-side Sentry disabled - server-side tracking still active');

// No-op export for compatibility
export const sentry = {
  init: () => false,
  trackError: () => {},
  addBreadcrumb: () => {},
};
