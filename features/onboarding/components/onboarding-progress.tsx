"use client";

import { OnboardingSession, OnboardingStatus } from '../lib/types/onboarding-session';
import { ONBOARDING_STEPS, calculateProgress } from '../lib/constants/onboarding-steps';
import { Progress, Card, CardContent, CardHeader, CardTitle } from '@/features/shared';
import { Check, Circle, Loader2 } from 'lucide-react';

interface OnboardingProgressProps {
  session: OnboardingSession;
}

export function OnboardingProgress({ session }: OnboardingProgressProps) {
  const progress = calculateProgress(session.data.completedSteps);
  const currentStep = ONBOARDING_STEPS.find(step => step.status === session.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Setup Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current step */}
        {currentStep && (
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="font-medium text-sm">Current Step</span>
            </div>
            <p className="text-sm text-muted-foreground">{currentStep.name}</p>
          </div>
        )}

        {/* Steps list */}
        <div className="space-y-2">
          {ONBOARDING_STEPS.filter(step => step.required).map((step) => {
            const isCompleted = session.data.completedSteps.includes(step.status);
            const isCurrent = step.status === session.status;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isCurrent ? 'bg-muted' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  ) : isCurrent ? (
                    <div className="h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center">
                      <Circle className="h-3 w-3 fill-primary text-primary" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    isCompleted ? 'text-foreground' : 
                    isCurrent ? 'text-primary' : 
                    'text-muted-foreground'
                  }`}>
                    {step.name}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Session info */}
        <div className="pt-4 border-t space-y-1 text-xs text-muted-foreground">
          <div>Started: {new Date(session.startedAt).toLocaleString()}</div>
          <div>Session ID: {session.id.substring(0, 8)}...</div>
        </div>
      </CardContent>
    </Card>
  );
}
