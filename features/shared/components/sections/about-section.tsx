"use client";

import { PhoneOff, DollarSign, Bot, User } from "lucide-react";

export function AboutSection() {
  const journey = [
    {
      icon: PhoneOff,
      title: "Missed Calls",
      subtitle: "Lost Revenue/ bad user experience",
      description: "Tradies constantly miss calls while on jobs. Every missed call is a lost customer, lost revenue, and damaged reputation. You can't be in two places at once.",
      gradient: "from-destructive to-destructive/80",
      borderColor: "border-destructive/50"
    },
    {
      icon: DollarSign,
      title: "Money",
      subtitle: "Can't Afford a Receptionist",
      description: "Hiring a full-time receptionist costs $50,000+ per year. Most small businesses can't justify this expense, leaving them stuck between missing calls or going broke.",
      gradient: "from-secondary to-secondary/80",
      borderColor: "border-secondary/50"
    },
    {
      icon: Bot,
      title: "Unnatural chatbots",
      subtitle: "Current bots is robotic and unnatural",
      description: "Existing chatbots and phone systems are robotic, frustrating, and drive customers away. They can't handle real conversations or complex booking requirements.",
      gradient: "from-primary to-primary/80",
      borderColor: "border-primary/50"
    }
  ];

  return (
    <section id="about" className="relative py-20 md:py-32 overflow-hidden">

      {/* Neural network background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-px h-32 bg-gradient-to-b from-primary via-secondary to-transparent" />
        <div className="absolute top-1/3 right-1/3 w-24 h-px bg-gradient-to-r from-secondary via-primary to-transparent" />
        <div className="absolute bottom-1/4 left-1/2 w-px h-24 bg-gradient-to-t from-accent via-primary to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-block mb-4">
            <div className="floating-data-display border-secondary/40">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-secondary" />
                <span className="text-secondary font-mono text-sm font-bold tracking-wider">ABOUT SKEDY</span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 glow-text">
            Born from <span className="bg-gradient-to-r from-destructive to-primary bg-clip-text text-transparent">3 Big Problems</span> Every Tradie Faces
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            How missing calls, tight budgets, and terrible automation sparked a revolution.
          </p>
        </div>

        {/* Journey Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 mb-16">
          {journey.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div
                key={step.title}
                className="relative group"
                style={{
                  animationDelay: `${index * 0.3}s`
                }}
              >
                {/* Connection line */}
                {index < journey.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-6 w-12 h-px bg-gradient-to-r from-primary to-secondary animate-pulse" />
                )}

                <div className="text-center hover:scale-105 transition-all duration-500">
                  {/* Step Icon */}
                  <div className="relative mb-6 inline-block">
                    <div className={`p-3 sm:p-4 bg-gradient-to-r ${step.gradient} rounded-2xl shadow-2xl border-2 border-white/20`}>
                      <IconComponent className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-background rounded-full border-2 border-primary flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-card-foreground mb-2 glow-text">
                    {step.title}
                  </h3>
                  <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-4">
                    {step.subtitle}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>


        {/* Founder Quote */}
        <div className="mt-20 text-center">
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center shadow-2xl">
              <span className="text-3xl font-bold text-white">JB</span>
            </div>
            <div className="text-left">
              <h4 className="text-xl sm:text-2xl font-bold text-foreground glow-text">Juan Bernal</h4>
              <p className="text-primary font-semibold text-lg">Founder & CEO</p>
            </div>
          </div>

          <blockquote className="text-lg sm:text-xl md:text-2xl text-foreground italic leading-relaxed max-w-4xl mx-auto">
            &quot;Every missed call is a missed opportunity. I built Skedy because every tradie deserves to capture every lead,
            provide instant quotes, and deliver professional service — without breaking the bank or missing jobs.&quot;
          </blockquote>
        </div>
      </div>
    </section>
  );
}
