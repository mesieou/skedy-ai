"use client";

import { Calendar, Clock, Calculator, MessageCircle, Zap, CheckCircle, Phone, Smartphone, Users, DollarSign, MapPin, ClipboardList } from "lucide-react";

export function ServicesSection() {
  const services = [
    {
      icon: Phone,
      title: "24/7 Availability",
      subtitle: "Never Miss Another Call",
      description: "Your AI receptionist answers every call, text, and inquiry instantly - even at 3 AM, weekends, and holidays. No more missed opportunities.",
      features: [
        "Instant call answering 24/7",
        "Multi-channel support (phone, SMS, web)",
        "Handles unlimited concurrent customers",
        "Never takes sick days or holidays"
      ],
      visualElements: [
        { icon: Phone, label: "Incoming Call", position: "top-4 left-4", color: "text-green-400", bg: "bg-green-400/20" },
        { icon: Smartphone, label: "SMS", position: "top-4 right-4", color: "text-blue-400", bg: "bg-blue-400/20" },
        { icon: MessageCircle, label: "Web Chat", position: "bottom-4 left-4", color: "text-purple-400", bg: "bg-purple-400/20" },
        { icon: Clock, label: "24/7", position: "bottom-4 right-4", color: "text-cyan-400", bg: "bg-cyan-400/20" }
      ],
      gradient: "from-cyan-500 to-blue-600",
      borderColor: "border-cyan/50",
      shadowColor: "shadow-cyan/30"
    },
    {
      icon: Calculator,
      title: "Smart Quote Generation",
      subtitle: "Instant Accurate Quotes",
      description: "Advanced travel calculations, service pricing, and instant quote generation. Your customers get professional quotes in seconds, not hours.",
      features: [
        "Automatic travel distance calculations",
        "Real-time pricing based on your rates",
        "Multiple quote options for customers",
        "Instant quote delivery via SMS/email"
      ],
      visualElements: [
        { icon: MapPin, label: "Distance", position: "top-4 left-4", color: "text-pink-400", bg: "bg-pink-400/20" },
        { icon: DollarSign, label: "Price", position: "top-4 right-4", color: "text-green-400", bg: "bg-green-400/20" },
        { icon: Calculator, label: "Calculate", position: "bottom-4 left-4", color: "text-blue-400", bg: "bg-blue-400/20" },
        { icon: Zap, label: "Instant", position: "bottom-4 right-4", color: "text-yellow-400", bg: "bg-yellow-400/20" }
      ],
      gradient: "from-pink-500 to-purple-600",
      borderColor: "border-pink/50",
      shadowColor: "shadow-pink/30"
    },
    {
      icon: Calendar,
      title: "Team Calendar Management",
      subtitle: "Multi-Person Scheduling",
      description: "Seamlessly manages availability for your entire team. Checks multiple calendars, finds optimal time slots, and books appointments automatically.",
      features: [
        "Multi-person calendar integration",
        "Real-time availability checking",
        "Automatic conflict resolution",
        "Team workload balancing"
      ],
      visualElements: [
        { icon: Users, label: "Team", position: "top-4 left-4", color: "text-blue-400", bg: "bg-blue-400/20" },
        { icon: Calendar, label: "Calendar", position: "top-4 right-4", color: "text-purple-400", bg: "bg-purple-400/20" },
        { icon: CheckCircle, label: "Available", position: "bottom-4 left-4", color: "text-green-400", bg: "bg-green-400/20" },
        { icon: ClipboardList, label: "Scheduled", position: "bottom-4 right-4", color: "text-orange-400", bg: "bg-orange-400/20" }
      ],
      gradient: "from-purple-500 to-indigo-600",
      borderColor: "border-purple/50",
      shadowColor: "shadow-purple/30"
    },
    {
      icon: MessageCircle,
      title: "Complete Customer Service",
      subtitle: "Answer Everything",
      description: "Handles all customer inquiries with intelligent responses. From service questions to booking changes - your AI knows it all.",
      features: [
        "Comprehensive FAQ knowledge base",
        "Service details and explanations",
        "Booking modifications and cancellations",
        "Intelligent escalation when needed"
      ],
      visualElements: [
        { icon: MessageCircle, label: "Chat", position: "top-4 left-4", color: "text-green-400", bg: "bg-green-400/20" },
        { icon: Phone, label: "Call", position: "top-4 right-4", color: "text-blue-400", bg: "bg-blue-400/20" },
        { icon: CheckCircle, label: "Resolved", position: "bottom-4 left-4", color: "text-purple-400", bg: "bg-purple-400/20" },
        { icon: Zap, label: "Instant", position: "bottom-4 right-4", color: "text-yellow-400", bg: "bg-yellow-400/20" }
      ],
      gradient: "from-red-500 to-pink-600",
      borderColor: "border-red/50",
      shadowColor: "shadow-red/30"
    }
  ];

  return (
    <section id="services" className="relative py-20 md:py-32 overflow-hidden">

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
                <span className="text-primary font-mono text-sm font-bold tracking-wider">SERVICES</span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 glow-text">
            Your <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">AI Receptionist</span> Capabilities
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Powerful AI technology that transforms how your business handles customer interactions.
            Built specifically for tradies who need reliable, professional customer service.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div
                key={service.title}
                className="group futuristic-card p-8 md:p-10 hover:scale-105 transition-all duration-500 relative overflow-hidden"
                style={{
                  animationDelay: `${index * 0.2}s`
                }}
              >
                {/* Visual Elements Background */}
                <div className="absolute inset-0 opacity-30 dark:opacity-50">
                  {service.visualElements.map((element, elemIndex) => {
                    const ElementIcon = element.icon;
                    return (
                      <div
                        key={elemIndex}
                        className={`absolute ${element.position} ${element.bg} rounded-lg p-2 border border-white/20 backdrop-blur-sm`}
                        style={{
                          animationDelay: `${elemIndex * 0.5}s`
                        }}
                      >
                        <ElementIcon className={`h-4 w-4 ${element.color}`} />
                      </div>
                    );
                  })}

                  {/* Connecting lines between elements */}
                  <div className="absolute top-8 left-8 w-16 h-px bg-gradient-to-r from-white/30 to-transparent animate-pulse" />
                  <div className="absolute top-8 right-8 w-px h-16 bg-gradient-to-b from-white/30 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute bottom-8 left-8 w-16 h-px bg-gradient-to-r from-white/30 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
                  <div className="absolute bottom-8 right-8 w-px h-16 bg-gradient-to-b from-white/30 to-transparent animate-pulse" style={{ animationDelay: '1.5s' }} />
                </div>

                {/* Service Icon */}
                <div className={`relative mb-6 inline-block z-10`}>
                  <div className={`p-6 bg-gradient-to-r ${service.gradient} rounded-2xl shadow-2xl border-2 border-white/20`}>
                    <IconComponent className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />
                  </div>
                </div>

                {/* Service Content */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-card-foreground mb-2 glow-text">
                      {service.title}
                    </h3>
                    <p className="text-primary font-semibold text-sm uppercase tracking-wider">
                      {service.subtitle}
                    </p>
                  </div>

                  <p className="text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>

                  {/* Feature List */}
                  <ul className="space-y-3">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <CheckCircle className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm text-card-foreground font-medium">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
