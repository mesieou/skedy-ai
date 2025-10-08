"use client";

import { PhoneCall, Users, Brain, Target, Sparkles, ArrowRight, LucideIcon, Play } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { trackFacebookPixelEvent } from "../analytics/facebook-pixel-provider";

interface DemoElement {
  type: string;
  label: string;
  time?: string;
  status?: string;
  distance?: string;
  total?: string;
  availability?: string;
  confirmation?: string;
  quality?: string;
  improvement?: string;
  accuracy?: string;
}

interface Product {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  impact: string;
  demoElements: DemoElement[];
  gradient: string;
  glowColor: string;
  stats: Record<string, string>;
}

export function ProductsSection() {
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);

  const products: Product[] = [
    {
      icon: PhoneCall,
      title: "Never Miss a Call",
      subtitle: "24/7 AI Receptionist",
      description: "Your AI answers instantly, every time. No more lost customers while you're on the job.",
      impact: "391% more leads captured",
      demoElements: [
        { type: "incoming-call", label: "Incoming Call", time: "3:47 AM", status: "answered" },
        { type: "sms", label: "SMS Inquiry", time: "11:23 PM", status: "responded" },
        { type: "web-chat", label: "Website Chat", time: "6:15 AM", status: "handled" }
      ],
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      glowColor: "shadow-emerald-500/50",
      stats: { availability: "24/7", languages: "any", response: "instant" }
    },
    {
      icon: Target,
      title: "Instant Smart Quotes",
      subtitle: "AI-Powered Pricing",
      description: "Advanced calculations deliver professional quotes in seconds. Watch your conversion rate soar.",
      impact: "67% faster quote delivery",
      demoElements: [
        { type: "location", label: "📍 Melbourne → Richmond", distance: "12.4km" },
        { type: "calculation", label: "💰 $245 + $89 travel", total: "$334" },
        { type: "delivery", label: "📱 Quote sent via SMS", time: "8 seconds" }
      ],
      gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
      glowColor: "shadow-violet-500/50",
      stats: { calculation: "auto", delivery: "voice/SMS", speed: "seconds" }
    },
    {
      icon: Users,
      title: "Smart Team Scheduling",
      subtitle: "Multi-Calendar Magic",
      description: "AI manages your entire team's availability. Optimal scheduling, zero conflicts, maximum efficiency.",
      impact: "45% better team utilization",
      demoElements: [
        { type: "team-view", label: "👥 3 team members", availability: "checking..." },
        { type: "optimal-slot", label: "🎯 Best slot found", time: "Tue 2:30 PM" },
        { type: "auto-book", label: "✅ Automatically booked", confirmation: "sent" }
      ],
      gradient: "from-blue-500 via-indigo-500 to-purple-500",
      glowColor: "shadow-blue-500/50",
      stats: { calendars: "multi", availability: "searches", booking: "instant" }
    },
    {
      icon: Brain,
      title: "Human-Like AI",
      subtitle: "Natural Conversations",
      description: "Advanced AI that learns from every interaction. Gets smarter daily, handles complex requests naturally.",
      impact: "Customers can't tell it's AI",
      demoElements: [
        { type: "conversation", label: "🗣️ Natural dialogue", quality: "human-like" },
        { type: "learning", label: "🧠 Learning from chat", improvement: "+2.3%" },
        { type: "context", label: "🎯 Context awareness", accuracy: "94.7%" }
      ],
      gradient: "from-rose-500 via-pink-500 to-red-500",
      glowColor: "shadow-rose-500/50",
      stats: { language: "natural", learning: "continuous", context: "aware" }
    }
  ];

  return (
    <section id="products" className="relative py-20 md:py-32 overflow-hidden">

      {/* Floating particles */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-ping" />
      <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-secondary/40 rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-accent/30 rounded-full animate-bounce" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-block mb-4">
            <div className="floating-data-display border-primary/40">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-primary font-mono text-sm font-bold tracking-wider">PRODUCTS</span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 glow-text">
            Your <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">AI Receptionist</span> Products
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Powerful AI technology that transforms how your business handles customer interactions.
            Built specifically for tradies who need reliable, professional customer service.
          </p>
        </div>

        {/* Products Grid - New Amazing Design */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {products.map((product, index) => {
            const IconComponent = product.icon;
            const isHovered = hoveredProduct === index;

            return (
              <div
                key={product.title}
                className="group relative"
                onMouseEnter={() => setHoveredProduct(index)}
                onMouseLeave={() => setHoveredProduct(null)}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Main Product Card */}
                <div className={`
                  relative p-8 lg:p-10 rounded-3xl border-2 border-white/10
                  bg-gradient-to-br from-background/80 via-background/60 to-background/40
                  backdrop-blur-xl transition-all duration-700 overflow-hidden
                  hover:scale-[1.02] hover:border-white/20
                  ${isHovered ? `shadow-2xl ${product.glowColor}` : 'shadow-xl shadow-black/20'}
                `}>

                  {/* Animated Background Gradient */}
                  <div className={`
                    absolute inset-0 bg-gradient-to-br ${product.gradient} opacity-5
                    transition-opacity duration-700 rounded-3xl
                    ${isHovered ? 'opacity-10' : 'opacity-5'}
                  `} />

                  {/* Floating Demo Elements */}
                  <div className="absolute inset-0 overflow-hidden rounded-3xl">
                    {product.demoElements.map((demo, demoIndex) => (
                      <div
                        key={demoIndex}
                        className={`
                          absolute bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2
                          border border-white/20 text-xs font-mono transition-all duration-1000
                          ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-2'}
                        `}
                        style={{
                          top: `${20 + demoIndex * 25}%`,
                          right: `${10 + (demoIndex % 2) * 20}%`,
                          animationDelay: `${demoIndex * 0.3}s`,
                        }}
                      >
                        <div className="text-white/90">{demo.label}</div>
                        {demo.time && <div className="text-primary text-[10px]">{demo.time}</div>}
                        {demo.status && <div className="text-green-400 text-[10px]">✓ {demo.status}</div>}
                        {demo.distance && <div className="text-blue-400 text-[10px]">{demo.distance}</div>}
                        {demo.total && <div className="text-green-400 text-[10px] font-bold">{demo.total}</div>}
                      </div>
                    ))}
                  </div>

                  {/* Product Header */}
                  <div className="relative z-10 mb-6">
                    {/* Icon with Pulse Effect */}
                    <div className="relative mb-4 inline-block">
                      <div className={`
                        p-4 rounded-2xl bg-gradient-to-r ${product.gradient}
                        shadow-2xl border-2 border-white/30 transition-all duration-500
                        ${isHovered ? 'scale-110 shadow-3xl' : 'scale-100'}
                      `}>
                        <IconComponent className="h-8 w-8 text-white" />
                      </div>

                      {/* Pulse Ring */}
                      <div className={`
                        absolute inset-0 rounded-2xl bg-gradient-to-r ${product.gradient}
                        animate-ping opacity-20 transition-opacity duration-500
                        ${isHovered ? 'opacity-40' : 'opacity-20'}
                      `} />
                    </div>

                    {/* Title & Impact */}
                    <div className="space-y-2">
                      <h3 className="text-2xl lg:text-3xl font-bold text-foreground glow-text">
                        {product.title}
                      </h3>
                      <p className="text-primary font-semibold text-sm uppercase tracking-wider">
                        {product.subtitle}
                      </p>
                      <div className={`
                        inline-flex items-center gap-2 px-3 py-1 rounded-full
                        bg-gradient-to-r ${product.gradient} text-white text-sm font-bold
                        shadow-lg transition-all duration-500
                        ${isHovered ? 'scale-105 shadow-xl' : 'scale-100'}
                      `}>
                        <Sparkles className="h-4 w-4" />
                        {product.impact}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="relative z-10 text-muted-foreground leading-relaxed mb-6 text-base">
                    {product.description}
                  </p>

                  {/* Live Stats */}
                  <div className="relative z-10 grid grid-cols-3 gap-4 p-4 rounded-2xl bg-black/20 border border-white/10">
                    {Object.entries(product.stats).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="text-lg font-bold text-white">{value}</div>
                        <div className="text-xs text-muted-foreground capitalize">{key}</div>
                      </div>
                    ))}
                  </div>

                  {/* Hover Arrow */}
                  <div className={`
                    absolute bottom-6 right-6 transition-all duration-500
                    ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
                  `}>
                    <ArrowRight className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action Buttons */}
        <div className="text-center mt-16 md:mt-20">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 w-full max-w-md sm:max-w-none mx-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto btn text-sm sm:text-base min-h-[48px] sm:min-h-[44px]"
              onClick={() => {
                const demoTrigger = document.querySelector('[data-demo-trigger]') as HTMLButtonElement;
                demoTrigger?.click();
              }}
            >
              <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
              Try Demo
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto btn-futuristic-outline px-4 sm:px-8 py-3 text-sm sm:text-base min-h-[48px] sm:min-h-[44px] font-medium"
              onClick={() => {
                trackFacebookPixelEvent('Lead');
                const waitlistTrigger = document.querySelector('[data-waitlist-trigger]') as HTMLButtonElement;
                waitlistTrigger?.click();
              }}
            >
              <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
              <span className="block sm:hidden">Join Waitlist</span>
              <span className="hidden sm:block">Get notified when we launch</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
