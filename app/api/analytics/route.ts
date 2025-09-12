/**
 * Simple Analytics API
 *
 * Basic REST endpoint for analytics dashboard
 * No fancy streaming, no events - just simple data
 */

import { NextRequest, NextResponse } from 'next/server';
import { PostgresAnalyticsManager } from '../../../features/token-usage-analytics/lib/postgres-analytics-manager';

// Simple analytics manager
const analyticsManager = new PostgresAnalyticsManager();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'summary':
        const summary = await analyticsManager.getAnalyticsSummary();
        return NextResponse.json({ success: true, data: summary });

      case 'businesses':
        const businesses = await analyticsManager.getBusinessAnalytics();
        return NextResponse.json({ success: true, data: businesses });

      case 'recent':
        const recent = await analyticsManager.getRecentCalls();
        return NextResponse.json({ success: true, data: recent });

      case 'all':
        // Get everything at once for efficiency
        const [allSummary, allBusinesses, allRecent] = await Promise.all([
          analyticsManager.getAnalyticsSummary(),
          analyticsManager.getBusinessAnalytics(),
          analyticsManager.getRecentCalls(10)
        ]);

        return NextResponse.json({
          success: true,
          data: {
            summary: allSummary,
            businesses: allBusinesses,
            recent: allRecent,
            status: { status: 'active', accountId: 'skedy-main', timestamp: Date.now() }
          }
        });

      default:
        return NextResponse.json({
          error: 'Invalid type. Use: summary, businesses, recent, or all',
          availableTypes: ['summary', 'businesses', 'recent', 'all']
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ [Analytics API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
