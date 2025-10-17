"use client";

import { useState, useEffect } from 'react';
import { OnboardingSession, OnboardingStatus } from '../lib/types/onboarding-session';
import { OnboardingChat } from './onboarding-chat';
import { OnboardingProgress } from './onboarding-progress';
import { BusinessInfoReview } from './business-info-review';
import { Button, Card, CardContent } from '@/features/shared';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Main onboarding container component
 * Orchestrates the entire onboarding flow
 */
export function OnboardingContainer() {
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();

  // Initialize onboarding session
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      const response = await fetch('/api/onboarding/session', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to initialize session');
      }

      const data = await response.json();
      setSession(data.session);
    } catch (error) {
      console.error('Error initializing session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionUpdate = (updatedSession: OnboardingSession) => {
    setSession(updatedSession);
  };

  const handleCompleteOnboarding = async () => {
    if (!session) return;

    setIsCompleting(true);
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [OnboardingContainer] Validation errors:', errorData.details);
        throw new Error(errorData.details ? errorData.details.join(', ') : 'Failed to complete onboarding');
      }

      const data = await response.json();
      
      // Redirect to dashboard
      router.push(`/protected/dashboard?businessId=${data.business.id}`);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete onboarding. Please try again.';
      alert(`Failed to complete onboarding:\n\n${errorMessage}`);
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Failed to load onboarding session</p>
            <Button onClick={initializeSession} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed state
  if (session.status === OnboardingStatus.COMPLETED) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold">Onboarding Complete!</h2>
            <p className="text-muted-foreground">
              Your business has been set up successfully. Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Welcome to Skedy</h1>
          <p className="text-muted-foreground">
            Let's set up your AI-powered booking system
          </p>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar - Progress */}
          <div className="lg:col-span-1">
            <OnboardingProgress session={session} />
          </div>

          {/* Main area - Chat or Review */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-250px)] min-h-[600px] max-h-[800px] flex flex-col">
              <CardContent className="flex-1 p-0 overflow-hidden">
                {session.status === OnboardingStatus.REVIEWING_ANALYSIS && 
                 session.data.businessAnalysis ? (
                  // Show business info review
                  <div className="p-6 overflow-y-auto h-full">
                    <BusinessInfoReview
                      analysis={session.data.businessAnalysis}
                      onConfirm={() => {
                        // User can confirm via chat
                      }}
                      onEdit={() => {
                        // User can edit via chat
                      }}
                    />
                  </div>
                ) : (
                  // Show chat interface
                  <OnboardingChat
                    session={session}
                    onSessionUpdate={handleSessionUpdate}
                  />
                )}
              </CardContent>
            </Card>

            {/* Complete button (shown in final review) */}
            {session.status === OnboardingStatus.FINAL_REVIEW && (
              <div className="mt-4">
                <Button
                  onClick={handleCompleteOnboarding}
                  disabled={isCompleting}
                  className="w-full"
                  size="lg"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating your business...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete Setup & Launch
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
