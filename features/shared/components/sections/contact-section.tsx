"use client";

import { Mail, Phone, MessageSquare, MapPin } from "lucide-react";

export function ContactSection() {
  const contactMethods = [
    {
      icon: Mail,
      title: "Email Us",
      subtitle: "General Inquiries",
      value: "info@skedy.io",
      href: "mailto:info@skedy.io",
      description: "For partnerships, support, or general questions",
      gradient: "from-primary to-primary/80",
      borderColor: "border-primary/50"
    },
    {
      icon: Phone,
      title: "Call Us",
      subtitle: "Direct Line",
      value: "0411 851 098",
      href: "tel:+61411851098",
      description: "Speak directly with our team",
      gradient: "from-secondary to-secondary/80",
      borderColor: "border-secondary/50"
    },
    {
      icon: MessageSquare,
      title: "Try Our Demo",
      subtitle: "Experience Skedy",
      value: "Live Demo",
      href: "#demo",
      description: "See how Skedy handles your business calls",
      gradient: "from-accent to-accent/80",
      borderColor: "border-accent/50"
    }
  ];

  const socialLinks = [
    {
      name: "Instagram",
      href: "https://www.instagram.com/skedy.io",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
        </svg>
      ),
      color: "text-pink-500 hover:text-pink-400"
    },
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/company/skedy-io",
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      color: "text-blue-500 hover:text-blue-400"
    }
  ];

  return (
    <section id="contact" className="relative py-20 md:py-32 overflow-hidden">

      {/* Floating contact indicators */}
      <div className="absolute top-1/4 left-1/4 floating-data-display border-accent/40 animate-float opacity-60">
        <div className="flex items-center gap-2">
          <Mail className="h-3 w-3 text-accent" />
          <span className="text-accent font-mono text-xs font-bold">EMAIL</span>
        </div>
      </div>
      <div className="absolute top-1/3 right-1/3 floating-data-display border-primary/40 animate-float opacity-60" style={{ animationDelay: '1s' }}>
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 text-primary" />
          <span className="text-primary font-mono text-xs font-bold">CALL US</span>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-block mb-4">
            <div className="floating-data-display border-accent/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-accent" />
                <span className="text-accent font-mono text-sm font-bold tracking-wider">CONTACT</span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 glow-text">
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Get</span> in
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Touch</span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Ready to transform your customer service? We&apos;re here to help you get started with Skedy AI.
          </p>
        </div>


        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {contactMethods.map((method, index) => {
            const IconComponent = method.icon;
            const isDemoButton = method.title === "Try Our Demo";

            if (isDemoButton) {
              return (
                <button
                  key={method.title}
                  onClick={() => {
                    // Scroll to hero and trigger demo modal
                    document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
                    setTimeout(() => {
                      const demoButton = document.querySelector('[data-demo-trigger]') as HTMLButtonElement;
                      demoButton?.click();
                    }, 500);
                  }}
                  className="group text-center hover:scale-105 transition-all duration-500 block w-full"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  {/* Icon */}
                  <div className="relative mb-6 inline-block">
                    <div className={`p-6 bg-gradient-to-r ${method.gradient} rounded-2xl shadow-2xl ${method.borderColor} border-2`}>
                      <IconComponent className="h-12 w-12 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-accent rounded-full animate-pulse" />
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 glow-text">
                    {method.title}
                  </h3>
                  <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-4">
                    {method.subtitle}
                  </p>
                  <p className="text-xl font-mono text-foreground mb-4 group-hover:text-primary transition-colors">
                    {method.value}
                  </p>
                  <p className="text-muted-foreground">
                    {method.description}
                  </p>
                </button>
              );
            }

            return (
              <a
                key={method.title}
                href={method.href}
                className="group text-center hover:scale-105 transition-all duration-500 block"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Icon */}
                <div className="relative mb-6 inline-block">
                  <div className={`p-6 bg-gradient-to-r ${method.gradient} rounded-2xl shadow-2xl ${method.borderColor} border-2`}>
                    <IconComponent className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-accent rounded-full animate-pulse" />
                </div>

                <h3 className="text-2xl font-bold text-foreground mb-3 glow-text">
                  {method.title}
                </h3>
                <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-4">
                  {method.subtitle}
                </p>
                <p className="text-xl font-mono text-foreground mb-4 group-hover:text-primary transition-colors">
                  {method.value}
                </p>
                <p className="text-muted-foreground">
                  {method.description}
                </p>
              </a>
            );
          })}
        </div>

        {/* Social Media & Location */}
        <div className="mt-16 text-center">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-8 glow-text">
            Connect With Us
          </h3>

          {/* Social Links */}
          <div className="flex justify-center gap-8 mb-8">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/30 hover:border-primary/60 transition-all duration-300 text-foreground hover:scale-110 group hover:shadow-2xl hover:shadow-primary/20"
                aria-label={social.name}
              >
                {social.icon}
              </a>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 text-muted-foreground mb-4">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="text-lg font-medium">Proudly Australian Made</span>
          </div>

          <p className="text-muted-foreground">
            Built by tradies, for tradies. Supporting Australian small businesses.
          </p>
          {/* Location */}
        </div>
      </div>
    </section>
  );
}
