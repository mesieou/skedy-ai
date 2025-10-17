"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/features/shared';
import { Loader2, Globe, FileText, Brain, Sparkles, CheckCircle2 } from 'lucide-react';

interface AnalysisProgressProps {
  isAnalyzing: boolean;
}

const ANALYSIS_STEPS = [
  { icon: Globe, label: 'Connecting to website', duration: 2000 },
  { icon: FileText, label: 'Reading content', duration: 3000 },
  { icon: Brain, label: 'Extracting information', duration: 4000 },
  { icon: Sparkles, label: 'Processing data', duration: 3000 },
  { icon: CheckCircle2, label: 'Finalizing analysis', duration: 2000 }
];

export function AnalysisProgress({ isAnalyzing }: AnalysisProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStep(0);
      setCompletedSteps([]);
      return;
    }

    let stepIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const advanceStep = () => {
      if (stepIndex < ANALYSIS_STEPS.length) {
        setCurrentStep(stepIndex);
        
        // Mark previous step as completed
        if (stepIndex > 0) {
          setCompletedSteps(prev => [...prev, stepIndex - 1]);
        }

        timeoutId = setTimeout(() => {
          stepIndex++;
          advanceStep();
        }, ANALYSIS_STEPS[stepIndex].duration);
      }
    };

    advanceStep();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAnalyzing]);

  if (!isAnalyzing) return null;

  return (
    <Card className="bg-muted/50 border-primary/20">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-medium text-sm">Analyzing your website...</span>
          </div>

          <div className="space-y-2">
            {ANALYSIS_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = completedSteps.includes(index);
              const isCurrent = currentStep === index;
              const isPending = index > currentStep;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    isCurrent ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="relative">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Icon className={`h-4 w-4 ${isPending ? 'text-muted-foreground/40' : 'text-primary'}`} />
                    )}
                  </div>
                  
                  <span
                    className={`text-sm ${
                      isCompleted
                        ? 'text-green-600 line-through'
                        : isCurrent
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>

                  {isCurrent && (
                    <div className="ml-auto">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              This may take 2 - 5 minutes depending on your website size
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
