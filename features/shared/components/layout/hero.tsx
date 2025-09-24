"use client";

import { useState } from "react";
import { FloatingTradieElements } from "../sections/floating-tradie-elements";
import { HeroContent } from "../sections/hero-content";
import { WaitlistModal } from "../sections/waitlist-modal";
import { Button } from "../ui/button";
import { Play, Users } from "lucide-react";
import { DemoModal } from "@/features/demo";
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
      alert(`Phone demo for ${businessType} coming soon!`);
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
        <div className="animate-in fade-in-0 duration-500">
          <DynamicDemoHero
            businessType={demoBusinessType}
            sessionData={demoSessionData}
            onEndDemo={handleEndDemo}
          />
        </div>
      ) : (
        <div className="relative flex flex-col gap-8 items-center min-h-screen justify-center overflow-hidden bg-transparent pt-20">
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
              >
                <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Try Demo
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border border-primary/30 text-foreground hover:bg-primary/10 px-6 sm:px-8 py-3 backdrop-blur-sm text-sm sm:text-base transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 glow-text"
                onClick={() => setIsWaitlistOpen(true)}
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
