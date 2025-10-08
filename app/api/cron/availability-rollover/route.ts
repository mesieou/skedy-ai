import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityManager } from '@/features/scheduling/lib/availability/availability-manager';

/**
 * API Route for availability rollover cron job
 * This endpoint is called by Vercel Cron at multiple times to cover all Australian timezones:
 * - 2:00 PM UTC (12:00 AM AEST/AEDT) - Sydney/Melbourne/Brisbane
 * - 2:30 PM UTC (12:00 AM ACDT) - Adelaide during daylight saving
 * - 4:00 PM UTC (12:00 AM AWST) - Perth
 * The system checks for businesses that need availability rollover at midnight in their timezone
 */
async function handleRollover(request: NextRequest) {
  console.log('[API] /api/cron/availability-rollover - Starting cron job execution');

  try {
    // Verify the request is coming from Vercel Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[API] /api/cron/availability-rollover - Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get optional currentUtcTime from request body (for testing)
    let currentUtcTime: string | undefined;
    try {
      const body = await request.json();
      currentUtcTime = body.currentUtcTime;
    } catch {
      // No body or invalid JSON - use current time
    }

    // Execute the availability rollover
    const startTime = Date.now();
    await AvailabilityManager.orchestrateAvailabilityRollover(currentUtcTime);
    const executionTime = Date.now() - startTime;

    console.log(`[API] /api/cron/availability-rollover - Successfully completed in ${executionTime}ms`);

    return NextResponse.json({
      success: true,
      message: 'Availability rollover completed successfully',
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] /api/cron/availability-rollover - Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRollover(request);
}

/**
 * Handle POST requests as well for manual triggering
 */
export async function POST(request: NextRequest) {
  return handleRollover(request);
}
