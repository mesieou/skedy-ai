import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/features/shared/lib/supabase/server';
import { ScrapingJobService } from '@/features/onboarding/lib/services/scraping-job-service';

/**
 * GET /api/onboarding/scraping-status?sessionId=xxx
 * Get the status of a scraping job
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ [ScrapingStatus API] Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get session ID from query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    console.log(`📊 [ScrapingStatus API] Checking status for session: ${sessionId}`);

    if (!sessionId) {
      console.log('❌ [ScrapingStatus API] No session ID provided');
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get job status
    const job = ScrapingJobService.getBySessionId(sessionId);

    if (!job) {
      console.log(`❌ [ScrapingStatus API] No job found for session: ${sessionId}`);
      
      // Debug: List all jobs in memory
      const allJobs = ScrapingJobService.getAllJobs();
      console.log(`📋 [ScrapingStatus API] All jobs in memory (${allJobs.length}):`, allJobs);
      
      return NextResponse.json(
        { error: 'No scraping job found for this session' },
        { status: 404 }
      );
    }

    console.log(`✅ [ScrapingStatus API] Found job: ${job.id}, status: ${job.status}`);

    // If job is still scraping, check database for progress
    if (job.status === 'scraping') {
      await ScrapingJobService.checkDatabaseProgress(job.id);
      // Get updated job
      const updatedJob = ScrapingJobService.get(job.id);
      return NextResponse.json(updatedJob);
    }

    return NextResponse.json(job);

  } catch (error) {
    console.error('❌ [ScrapingStatus API] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
