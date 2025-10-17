'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Globe, Sparkles } from 'lucide-react';

interface ScrapingJob {
  id: string;
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
}

interface ScrapingProgressProps {
  sessionId: string;
  onComplete?: (result: ScrapingJob['result']) => void;
  onError?: (error: string) => void;
}

export function ScrapingProgress({ sessionId, onComplete, onError }: ScrapingProgressProps) {
  const [job, setJob] = useState<ScrapingJob | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isPolling) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/onboarding/scraping-status?sessionId=${sessionId}`);
        
        if (response.ok) {
          const data = await response.json();
          setJob(data);
          setRetryCount(0); // Reset retry count on success

          // Stop polling if completed or failed
          if (data.status === 'completed') {
            setIsPolling(false);
            onComplete?.(data.result);
          } else if (data.status === 'failed') {
            setIsPolling(false);
            // Don't call onError - the system may have recovered via fallback
            // The AI will handle the response appropriately
            console.log('Job marked as failed, but system may have recovered via database fallback');
          }
        } else if (response.status === 404) {
          // No job found yet, keep polling (job might not be created yet)
          setRetryCount(prev => prev + 1);
          
          if (retryCount < 12) { // Wait up to 60 seconds (12 * 5s)
            console.log(`No scraping job found yet, waiting... (attempt ${retryCount + 1}/12)`);
          } else {
            console.error('Job not found after 60 seconds, stopping polling');
            setIsPolling(false);
            onError?.('Failed to start website analysis');
          }
        }
      } catch (error) {
        console.error('Failed to poll scraping status:', error);
      }
    };

    // Wait 2 seconds before first poll to give backend time to create job
    const initialTimeout = setTimeout(pollStatus, 2000);

    // Then poll every 5 seconds
    const interval = setInterval(pollStatus, 5000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [sessionId, isPolling, onComplete, onError, retryCount]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (!job) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 p-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-primary/20 rounded-full blur-md" />
            <Loader2 className="relative h-6 w-6 animate-spin text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground mb-1">
              Initializing website analysis...
            </h3>
            <p className="text-sm text-muted-foreground">
              Connecting to our AI-powered scraping service
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Completed state
  if (job.status === 'completed' && job.result) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-green-400/20 rounded-full blur-md" />
            <CheckCircle2 className="relative h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-base font-semibold text-green-900 mb-1">
                Analysis Complete! 🎉
              </h3>
              <p className="text-sm text-green-700">
                Successfully analyzed your website
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-green-200/50">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-green-600" />
                <p className="text-sm font-semibold text-green-900">
                  {job.result.businessName || 'Business information extracted'}
                </p>
              </div>
              {job.result.servicesFound && job.result.servicesFound > 0 && (
                <p className="text-xs text-green-700">
                  ✓ {job.result.servicesFound} services identified
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  if (job.status === 'failed') {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 p-6">
        <div className="flex items-start gap-4">
          <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-red-900 mb-1">
              Analysis Failed
            </h3>
            <p className="text-sm text-red-700">
              {job.error || 'Unable to analyze website'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Scraping/Analyzing state
  // Calculate progress based on elapsed time and status
  const elapsedSeconds = job.progress.elapsedSeconds || 0;
  const progressPercentage = job.progress.rowsScraped 
    ? Math.min((job.progress.rowsScraped / 100) * 100, 95) 
    : job.status === 'analyzing' ? 85 
    : job.progress.message.includes('MCP timeout') 
      ? Math.min(50 + (elapsedSeconds / 300) * 40, 90) // 50-90% over 5 minutes
      : Math.min(10 + (elapsedSeconds / 30) * 40, 50); // 10-50% for first 30 seconds

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 p-6">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" 
           style={{ backgroundSize: '200% 100%' }} />
      
      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-primary/20 rounded-full blur-md" />
            <Loader2 className="relative h-6 w-6 animate-spin text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground mb-1">
              {job.status === 'analyzing' ? '🤖 Analyzing with AI...' : '🌐 Scraping website content...'}
            </h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Time elapsed: {formatTime(job.progress.elapsedSeconds)}
              </span>
              {job.progress.rowsScraped && job.progress.rowsScraped > 0 && (
                <span className="text-primary font-medium">
                  {job.progress.rowsScraped} pages processed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              {job.status === 'analyzing' ? 'Extracting business information...' : 'Discovering your business...'}
            </span>
            <span className="text-primary font-semibold">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="relative h-2 bg-primary/10 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                   style={{ backgroundSize: '200% 100%' }} />
            </div>
          </div>
        </div>

        {/* Status message */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-background/50 backdrop-blur rounded-lg p-3 border border-border/50">
          <Globe className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
          <p className="leading-relaxed">
            {job.progress.message}
            <span className="block text-xs mt-1 italic opacity-75">
              {job.progress.message.includes('MCP timeout') ? (
                elapsedSeconds > 180 ? (
                  <>Large website detected. This may take up to 5 minutes. Please wait...</>
                ) : (
                  <>Request timed out but scraping continues in background. Checking for saved data...</>
                )
              ) : (
                <>Analyzing your website content and extracting business information</>
              )}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
