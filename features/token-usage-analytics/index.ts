/**
 * Usage Analytics - MVP Edition
 *
 * Simple analytics for startup MVP:
 * - Track usage and costs
 * - Monitor limits
 * - Dashboard data
 */

// Main service
export { PostgresAnalyticsManager } from './lib/postgres-analytics-manager';

// Components
export { AnalyticsDashboard } from './components/analytics-dashboard';
export { AnalyticsCard } from './components/analytics-card';
export { UsageLimitsCard } from './components/usage-limits-card';
export { StatusCard } from './components/status-card';
export { LoadingSpinner } from './components/loading-spinner';
export { ErrorMessage } from './components/error-message';

// Hooks
export { useAnalytics } from './hooks/use-analytics';

// Types
export type {
  AnalyticsSummary,
  BusinessAnalytics
} from './lib/postgres-analytics-manager';

export type {
  TokenSpent
} from '../shared/lib/database/types/chat-sessions';

// No legacy exports - clean architecture
