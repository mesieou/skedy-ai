"use client";

import { useState } from "react";
import { FloatingTradieElements } from "../sections/floating-tradie-elements";
import { HeroContent } from "../sections/hero-content";
import { WaitlistModal } from "../sections/waitlist-modal";
import { Button } from "../ui/button";
import { Play, Users } from "lucide-react";
import { DemoModal } from "@/features/demo";
import { ChatHero } from "@/features/demo/components/chat-hero";

interface DemoSessionData {
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
  console.log('🏠 [Hero] Component rendering...');

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
      // Futuristic transition effect
      setIsDemoActive(true);

      // Start real API call
      try {
        console.log('🚀 [Hero] Calling demo API...');
        const response = await fetch('/api/voice/demo-webrtc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
          tradieTypeId: businessType === 'removalist' ? 'transport' : businessType
        }),
        });

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ [Hero] Demo session created:', data);
        console.log('✅ [Hero] Setting demo session data...');

        // Store session data for ChatHero
        setDemoSessionData(data);
        console.log('✅ [Hero] Demo session data set:', data);

      } catch (error) {
        console.error('❌ [Hero] Failed to start demo:', error);
        alert('Failed to start demo. Please try again.');
        setIsDemoActive(false);
      }
    } else {
      alert(`Phone demo for ${businessType} coming soon!`);
    }
  };

  const handleEndDemo = async () => {
    // End demo session via API
    if (demoSessionData?.sessionId) {
      try {
        await fetch(`/api/voice/demo-webrtc?sessionId=${demoSessionData.sessionId}`, {
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

  console.log('🏠 [Hero] Current state:', {
    isWaitlistOpen,
    isDemoModalOpen,
    isDemoActive,
    demoBusinessType,
    demoSessionData,
    timestamp: Date.now()
  });


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
          <ChatHero
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
                  console.log('🏠 [Hero] Try Demo button clicked - opening modal');
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
