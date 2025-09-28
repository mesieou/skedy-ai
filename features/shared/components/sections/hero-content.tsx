"use client";

import { Typewriter } from 'react-simple-typewriter';

const HeroContent = () => {
  const words = [
    'Bookings',
    'Calendars',
    'Inquiries',
    'Payments',
    'Support',
    'Customer Service'
  ];

  return (
    <div className="text-center">
      <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-4 sm:mb-6 md:mb-8 leading-tight max-w-6xl mx-auto px-4 glow-text">
        <span className="block mb-1 sm:mb-3">
          Your <span className="bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-2xl sm:text-4xl md:text-5xl lg:text-7xl inline-block shadow-lg shadow-primary/30">AI receptionist</span>
        </span>
        <span className="block mb-1 sm:mb-3">
          handles your
        </span>
        <span className="hero-rotating-text rounded-lg px-2 py-1 sm:px-3 sm:py-2 inline-block min-w-[200px] sm:min-w-[320px] text-2xl sm:text-4xl md:text-5xl lg:text-7xl shadow-lg shadow-secondary/30">
          <Typewriter
            words={words}
            loop={0}
            cursor
            cursorStyle='|'
            typeSpeed={70}
            deleteSpeed={50}
            delaySpeed={1500}
          />
        </span>
      </h1>

      <p className="text-base sm:text-lg md:text-xl hero-subtitle mb-6 sm:mb-8 md:mb-10 max-w-3xl mx-auto px-4 leading-relaxed font-normal">
        Never miss another customer. Skedy answers every call, books every appointment, and grows your business 24/7.
      </p>

      {/* Futuristic Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto mb-8 sm:mb-12 md:mb-16 px-4">
        <div className="hero-stats-card text-center p-3 sm:p-4 md:p-6 accent-lines">
          <div className="progress-ring mx-auto mb-3 flex items-center justify-center">
            <div className="text-lg sm:text-xl md:text-2xl font-bold stat-primary glow-text">391%</div>
          </div>
          <div className="text-xs sm:text-sm md:text-base text-muted-foreground font-medium leading-tight">Sales increase</div>
        </div>
        <div className="hero-stats-card text-center p-3 sm:p-4 md:p-6 accent-lines">
          <div className="progress-ring mx-auto mb-3 flex items-center justify-center">
            <div className="text-lg sm:text-xl md:text-2xl font-bold stat-destructive glow-text">50%+</div>
          </div>
          <div className="text-xs sm:text-sm md:text-base text-muted-foreground font-medium leading-tight">Cost reduction</div>
        </div>
        <div className="hero-stats-card text-center p-3 sm:p-4 md:p-6 accent-lines">
          <div className="progress-ring mx-auto mb-3 flex items-center justify-center">
            <div className="text-lg sm:text-xl md:text-2xl font-bold stat-secondary glow-text">90%</div>
          </div>
          <div className="text-xs sm:text-sm md:text-base text-muted-foreground font-medium leading-tight">Calls answered 24/7</div>
        </div>
        <div className="hero-stats-card text-center p-3 sm:p-4 md:p-6 accent-lines">
          <div className="progress-ring mx-auto mb-3 flex items-center justify-center">
            <div className="text-lg sm:text-xl md:text-2xl font-bold stat-accent glow-text">100%</div>
          </div>
          <div className="text-xs sm:text-sm md:text-base text-muted-foreground font-medium leading-tight">Customer satisfaction</div>
        </div>
      </div>
    </div>
  );
};

export { HeroContent };
export default HeroContent;
