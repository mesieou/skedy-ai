"use client";

import { useState } from "react";
import { FloatingTradieElements } from "../sections/floating-tradie-elements";
import { HeroContent } from "../sections/hero-content";
import { WaitlistModal } from "../sections/waitlist-modal";
import { Button } from "../ui/button";
import { Play, Users } from "lucide-react";

export function Hero() {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  return (
    <div className="relative flex flex-col gap-8 items-center min-h-screen justify-center overflow-hidden bg-transparent pt-20">
      <FloatingTradieElements />
      <div className="relative z-20 flex flex-col gap-8 items-center">
        <HeroContent />
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
          <Button
            size="lg"
            className="w-full sm:w-auto btn text-sm sm:text-base"
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

      <WaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
      />
    </div>
  );
}
