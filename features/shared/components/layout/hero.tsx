"use client";

import { useState } from "react";
import { FloatingTradieElements } from "../sections/floating-tradie-elements";
import { HeroContent } from "../sections/hero-content";
import { WaitlistModal } from "../sections/waitlist-modal";
import { Button } from "../ui/button";
import { Play, Users } from "lucide-react";
import { DemoModal } from "@/features/demo";
import * as Sentry from "@sentry/nextjs";
import dynamic from "next/dynamic";

// Dynamic import to prevent server-side compilation issues
const DynamicDemoHero = dynamic(() => import("@/features/demo/components/demo-hero").then(mod => ({ default: mod.DemoHero })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
});

interface DemoSessionData {
  businessType: string;
  sessionId: string;
  ephemeralToken: string;
  tradieType: {
    id: string;
    label: string;
    description: string;
    businessId: string;
  };
}

export function Hero() {

  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [demoBusinessType, setDemoBusinessType] = useState("");
  const [demoSessionData, setDemoSessionData] = useState<DemoSessionData | null>(null);

  const handleDemoClose = () => {
    console.log('🎭 [Hero] handleDemoClose called');
    setIsDemoModalOpen(false);
  };

  const handleStartDemo = async (businessType: string, method: 'web' | 'phone') => {
    console.log('🏠 [Hero] Starting demo:', { businessType, method });
    setDemoBusinessType(businessType);

    if (method === 'web') {
      // Close the modal first
      console.log('🚪 [Hero] Closing modal...');
      setIsDemoModalOpen(false);

      // Futuristic transition effect
      console.log('🎬 [Hero] Setting isDemoActive to true...');
      setIsDemoActive(true);

      // Emit event to parent page
      window.dispatchEvent(new CustomEvent('demoStateChange', {
        detail: { isActive: true }
      }));

      // Create session data for DemoHero
      const sessionData = {
        businessType: businessType,
        sessionId: `demo-${Date.now()}`,
        ephemeralToken: 'will-be-created-by-demohero',
        tradieType: {
          id: businessType, // This is already the BusinessCategory enum value from the modal
          label: businessType.charAt(0).toUpperCase() + businessType.slice(1),
          description: `${businessType} services`,
          businessId: 'demo-business'
        }
      };

      console.log('🔧 [Hero] Created simple session data:', sessionData);
      setDemoSessionData(sessionData);
      console.log('✅ [Hero] Demo activated - DemoHero will handle connection!');
    } else {
      // Phone demo - store business choice and redirect to single number
      try {
        // Store business choice before calling
        await fetch('/api/demo/store-business-choice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessType,
            userIP: 'demo-user' // Simple identifier
          })
        });

        console.log('📞 [Hero] Stored business choice, redirecting to phone:', { businessType });
        window.location.href = `tel:+61468002102`;
      } catch (error) {
        console.error('Failed to store business choice:', error);

        // Track error in frontend Sentry
        Sentry.captureException(error, {
          tags: {
            operation: 'store_business_choice',
            userAction: 'call_now_button'
          },
          extra: {
            businessType,
            component: 'hero'
          }
        });

        // Fallback: just call anyway
        window.location.href = `tel:+61468002102`;
      }
      setIsDemoModalOpen(false);
    }
  };

  const handleEndDemo = async () => {
    // End demo session via API
    if (demoSessionData?.sessionId) {
      try {
        await fetch(`/api/realtime-session?sessionId=${demoSessionData.sessionId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Failed to end demo session:', error);
      }
    }

    setIsDemoActive(false);
    setDemoBusinessType("");
    setDemoSessionData(null);

    // Emit event to parent page
    window.dispatchEvent(new CustomEvent('demoStateChange', {
      detail: { isActive: false }
    }));
  };

  return (
    <>
      {/* Demo Modal - EXACT WAITLIST PATTERN WITH FORMCARD */}
      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={handleDemoClose}
        onStartDemo={handleStartDemo}
      />

      {/* Waitlist Modal - OUTSIDE conditional rendering */}
      <WaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
      />

      {/* Main Content - CONDITIONAL */}
      {isDemoActive ? (
        <div className="fixed inset-0 z-[9999] bg-background">
          <DynamicDemoHero
            businessType={demoBusinessType}
            sessionData={demoSessionData}
            onEndDemo={handleEndDemo}
          />
        </div>
      ) : (
        <div id="hero" className="relative flex flex-col gap-8 items-center min-h-screen justify-center overflow-hidden bg-transparent">
          <FloatingTradieElements />
          <div className="relative z-20 flex flex-col gap-8 items-center">
            <HeroContent />
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
              <Button
                size="lg"
                className="w-full sm:w-auto btn text-sm sm:text-base"
                onClick={() => {
                  setIsDemoModalOpen(true);
                }}
                data-demo-trigger
              >
                <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Try Demo
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto btn-futuristic-outline px-6 sm:px-8 py-3 text-sm sm:text-base"
                onClick={() => setIsWaitlistOpen(true)}
                data-waitlist-trigger
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Join Waitlist
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
