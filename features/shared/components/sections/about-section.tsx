"use client";

import { Truck, Code, Brain, Target, Globe, Zap, User, ArrowRight } from "lucide-react";

export function AboutSection() {
  const journey = [
    {
      icon: Truck,
      title: "The Problem",
      subtitle: "Life as a Removalist",
      description: "Working as a removalist, I constantly missed calls while on jobs. Customers needed immediate responses, but I couldn't afford a full-time receptionist.",
      gradient: "from-destructive to-destructive/80",
      borderColor: "border-destructive/50"
    },
    {
      icon: Code,
      title: "The Learning",
      subtitle: "3 Years of AI & Programming",
      description: "I spent 3 years learning programming and AI technology. Initially wanted to build 'Uber for removalists' but realized the scope was too massive.",
      gradient: "from-secondary to-secondary/80",
      borderColor: "border-secondary/50"
    },
    {
      icon: Brain,
      title: "The Pivot",
      subtitle: "From Chatbot to Voice AI",
      description: "Started with a booking chatbot, but fellow tradies said customers prefer voice calls. So I built the world's most natural AI voice receptionist.",
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
            From <span className="bg-gradient-to-r from-destructive to-primary bg-clip-text text-transparent">Tradie</span> to
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> AI Pioneer</span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            The story of how a removalist's frustration became the solution for thousands of tradies worldwide.
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
                    <div className={`p-4 bg-gradient-to-r ${step.gradient} rounded-xl shadow-lg shadow-primary/30 futuristic-card ${step.borderColor}`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-background rounded-full border-2 border-primary flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                    </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-card-foreground mb-2 glow-text">
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

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20">
          {/* Mission */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
              <div className="p-4 bg-gradient-to-r from-primary to-secondary rounded-2xl shadow-2xl">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground glow-text">Our Mission</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed text-lg">
              Increase sales and save time for small service businesses by automating customer service with natural AI.
              Every tradie deserves professional customer service without the overhead.
            </p>
          </div>

          {/* Vision */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
              <div className="p-4 bg-gradient-to-r from-secondary to-accent rounded-2xl shadow-2xl">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground glow-text">Our Vision</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed text-lg">
              Be the world&apos;s fastest, most natural, and most capable AI virtual receptionist.
              We want every customer to get instant, high-quality service — and every business to focus on what they do best.
            </p>
          </div>
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
