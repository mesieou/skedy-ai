"use client";

import { User } from "@/features/auth/types";
import { useAnalytics } from "../hooks/use-analytics";
import { AnalyticsCard } from "./analytics-card";
import { UsageLimitsCard } from "./usage-limits-card";
import { StatusCard } from "./status-card";
import { LoadingSpinner } from "./loading-spinner";
import { ErrorMessage } from "./error-message";

interface AnalyticsDashboardProps {
  user: User;
}

export function AnalyticsDashboard({ user }: AnalyticsDashboardProps) {
  // User could be used for role-based access control in the future
  console.log('Analytics dashboard for user:', user.email);

  const {
    dashboard,
    limits,
    status,
    isLoading,
    error,
    refetch
  } = useAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage
        error={error}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusCard
          title="System Status"
          data={status}
        />

        <UsageLimitsCard
          title="Usage Limits"
          data={limits}
        />

        <AnalyticsCard
          title="Account Info"
          data={{
            accountId: dashboard?.accountId || 'skedy-main',
            lastUpdated: dashboard?.lastUpdated || Date.now()
          }}
        />
      </div>

      {/* Current Usage */}
      {dashboard?.currentUsage && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalyticsCard
            title="Tokens/Min (TPM)"
            data={{
              used: dashboard.currentUsage.tpmUsed,
              limit: dashboard.currentUsage.tpmLimit,
              percentage: dashboard.currentUsage.tpmPercentage
            }}
            type="usage"
          />

          <AnalyticsCard
            title="Requests/Min (RPM)"
            data={{
              used: dashboard.currentUsage.rpmUsed,
              limit: dashboard.currentUsage.rpmLimit,
              percentage: dashboard.currentUsage.rpmPercentage
            }}
            type="usage"
          />

          <AnalyticsCard
            title="Daily Cost"
            data={{
              used: dashboard.currentUsage.costToday,
              limit: dashboard.currentUsage.costLimit,
              percentage: dashboard.currentUsage.costPercentage
            }}
            type="cost"
          />

          <AnalyticsCard
            title="Token Breakdown"
            data={dashboard.tokenBreakdown}
            type="breakdown"
          />
        </div>
      )}

      {/* Top Consumers */}
      {dashboard?.topConsumers && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsCard
            title="Top Businesses"
            data={dashboard.topConsumers.byBusiness}
            type="list"
          />

          <AnalyticsCard
            title="Usage by Type"
            data={dashboard.topConsumers.byEventType}
            type="list"
          />
        </div>
      )}
    </div>
  );
}
