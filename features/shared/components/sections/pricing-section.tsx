"use client";

import { useState } from "react";
import { DollarSign, Clock, Zap, Bell, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";

export function PricingSection() {
  const [isHovered, setIsHovered] = useState(false);

  const handleJoinWaitlist = () => {
    // Scroll to hero and trigger waitlist modal
    document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      const waitlistButton = document.querySelector('[data-waitlist-trigger]') as HTMLButtonElement;
      waitlistButton?.click();
    }, 500);
  };

  const features = [
    "Pay only for actual call time",
    "No monthly fees or setup costs",
    "24/7 AI receptionist service",
    "Unlimited concurrent calls",
    "Smart quote generation",
    "Calendar integration",
    "SMS and email notifications",
    "Real-time analytics dashboard"
  ];

  return (
    <section id="pricing" className="relative py-20 md:py-32 overflow-hidden">

      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-primary/30 rounded-full animate-spin" style={{ animationDuration: '20s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 border border-secondary/30 rounded-full animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-block mb-4">
            <div className="floating-data-display border-accent/40">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                <span className="text-accent font-mono text-sm font-bold tracking-wider">PRICING</span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 glow-text">
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Fair</span> &
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Transparent</span> Pricing
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            No hidden fees, no monthly subscriptions. Pay only for what you use - just like your customers pay you.
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="max-w-4xl mx-auto">
          <div
            className="futuristic-card p-12 md:p-16 text-center relative overflow-hidden group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Animated background effect */}
            <div className={`absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 transition-opacity duration-1000 ${isHovered ? 'opacity-100' : 'opacity-50'}`} />

            {/* Floating elements */}
            <div className="absolute top-8 left-8 w-2 h-2 bg-primary rounded-full animate-ping" />
            <div className="absolute top-12 right-12 w-1 h-1 bg-secondary rounded-full animate-pulse" />
            <div className="absolute bottom-8 left-1/3 w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />

            <div className="relative z-10">
              {/* Coming Soon Badge */}
              <div className="inline-block mb-8">
                <div className="floating-data-display border-primary/40 animate-pulse">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-primary font-mono text-sm font-bold tracking-wider">COMING SOON</span>
                  </div>
                </div>
              </div>

              <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-card-foreground mb-6 glow-text">
                Revolutionary Pricing
              </h3>

              <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                We&apos;re finalizing the most competitive pricing in the industry.
                Be the first to know when we launch with exclusive early-bird rates.
              </p>

              {/* Preview Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 max-w-3xl mx-auto">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card/20 border border-primary/20"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-card-foreground font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="space-y-4">
                <Button
                  size="lg"
                  onClick={handleJoinWaitlist}
                  className="w-full sm:w-auto btn text-sm sm:text-base px-4 sm:px-8 py-3 sm:py-4 min-h-[48px] sm:min-h-[44px]"
                >
                  <Bell className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="block sm:hidden">Join Waitlist</span>
                  <span className="hidden sm:block">Get Notified When We Launch</span>
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                </Button>
              </div>
            </div>

            {/* Holographic scan line */}
            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent transition-transform duration-3000 ${isHovered ? 'translate-x-full' : '-translate-x-full'}`} />
          </div>
        </div>

        {/* Value Proposition */}
        <div className="mt-16 text-center">
          <div className="futuristic-card p-8 max-w-3xl mx-auto">
            <h4 className="text-2xl font-bold text-card-foreground mb-4 glow-text">
              Why Pay-Per-Use Makes Sense
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Just like you charge customers for actual work done, we only charge for actual AI service time.
              No wasted money on unused monthly plans. Scale up or down based on your business needs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
