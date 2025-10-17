/**
 * Scraping Job Service
 * Manages background website scraping jobs with progress tracking
 */

export interface ScrapingJob {
  id: string;
  sessionId: string;
  websiteUrl: string;
  tableName: string;
  status: 'pending' | 'scraping' | 'analyzing' | 'completed' | 'failed';
  progress: {
    message: string;
    elapsedSeconds: number;
    rowsScraped?: number;
  };
  result?: {
    businessName?: string;
    servicesFound?: number;
    confidence?: number;
  };
  error?: string;
  startedAt: number;
  completedAt?: number;
}

// In-memory store for jobs (in production, use Redis or database)
const jobs = new Map<string, ScrapingJob>();

export class ScrapingJobService {
  /**
   * Create a new scraping job
   */
  static create(sessionId: string, websiteUrl: string, tableName: string): ScrapingJob {
    const jobId = `scrape_${sessionId}_${Date.now()}`;
    
    const job: ScrapingJob = {
      id: jobId,
      sessionId,
      websiteUrl,
      tableName,
      status: 'pending',
      progress: {
        message: 'Starting website analysis...',
        elapsedSeconds: 0
      },
      startedAt: Date.now()
    };
    
    jobs.set(jobId, job);
    console.log(`📝 [ScrapingJobService] Created job ${jobId} for session ${sessionId}`);
    console.log(`📝 [ScrapingJobService] Total jobs in memory: ${jobs.size}`);
    return job;
  }
  
  /**
   * Update job progress
   */
  static updateProgress(
    jobId: string, 
    status: ScrapingJob['status'],
    message: string,
    rowsScraped?: number
  ): void {
    const job = jobs.get(jobId);
    if (!job) return;
    
    job.status = status;
    job.progress = {
      message,
      elapsedSeconds: Math.floor((Date.now() - job.startedAt) / 1000),
      rowsScraped
    };
    
    jobs.set(jobId, job);
  }
  
  /**
   * Complete job with result
   */
  static complete(
    jobId: string,
    result: ScrapingJob['result']
  ): void {
    const job = jobs.get(jobId);
    if (!job) return;
    
    job.status = 'completed';
    job.result = result;
    job.completedAt = Date.now();
    job.progress.message = 'Analysis complete!';
    
    jobs.set(jobId, job);
  }
  
  /**
   * Mark job as failed
   */
  static fail(jobId: string, error: string): void {
    const job = jobs.get(jobId);
    if (!job) return;
    
    job.status = 'failed';
    job.error = error;
    job.completedAt = Date.now();
    job.progress.message = 'Analysis failed';
    
    jobs.set(jobId, job);
  }
  
  /**
   * Get job status (with updated elapsed time)
   */
  static get(jobId: string): ScrapingJob | undefined {
    const job = jobs.get(jobId);
    if (!job) return undefined;
    
    // Update elapsed time dynamically
    if (job.status !== 'completed' && job.status !== 'failed') {
      job.progress.elapsedSeconds = Math.floor((Date.now() - job.startedAt) / 1000);
    }
    
    return job;
  }
  
  /**
   * Get job by session ID (with updated elapsed time)
   */
  static getBySessionId(sessionId: string): ScrapingJob | undefined {
    for (const job of jobs.values()) {
      if (job.sessionId === sessionId) {
        // Update elapsed time dynamically
        if (job.status !== 'completed' && job.status !== 'failed') {
          job.progress.elapsedSeconds = Math.floor((Date.now() - job.startedAt) / 1000);
        }
        return job;
      }
    }
    return undefined;
  }
  
  /**
   * Delete old jobs (cleanup)
   */
  static cleanup(olderThanMs: number = 3600000): void {
    const now = Date.now();
    for (const [jobId, job] of jobs.entries()) {
      if (job.completedAt && (now - job.completedAt) > olderThanMs) {
        jobs.delete(jobId);
      }
    }
  }
  
  /**
   * Get all jobs (for debugging)
   */
  static getAllJobs(): Array<{ jobId: string; sessionId: string; status: string }> {
    const allJobs: Array<{ jobId: string; sessionId: string; status: string }> = [];
    for (const [jobId, job] of jobs.entries()) {
      allJobs.push({ jobId, sessionId: job.sessionId, status: job.status });
    }
    return allJobs;
  }
  
  /**
   * Check database for scraped rows and update progress
   */
  static async checkDatabaseProgress(jobId: string): Promise<void> {
    const job = jobs.get(jobId);
    if (!job) return;
    
    try {
      const { createAdminClient } = await import('@/features/shared/lib/supabase/admin-client');
      const supabase = createAdminClient();
      
      const { count, error } = await supabase
        .from(job.tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!error && count !== null && count > 0) {
        this.updateProgress(
          jobId,
          'scraping',
          `Scraping in progress... ${count} pages processed`,
          count
        );
      }
    } catch (error) {
      console.error(`Failed to check database progress:`, error);
    }
  }
}

// Cleanup old jobs every hour
setInterval(() => {
  ScrapingJobService.cleanup();
}, 3600000);
