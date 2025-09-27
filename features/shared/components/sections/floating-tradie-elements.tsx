"use client";

import { useEffect, useState } from 'react';

interface FloatingElement {
  id: string;
  x: number;
  y: number;
  delay: number;
  duration: number;
}

export const FloatingTradieElements = () => {
  const [elements, setElements] = useState<FloatingElement[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const generateElements = (): FloatingElement[] => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const elementCount = isMobile ? 3 : 5;
      const newElements: FloatingElement[] = [];

      for (let i = 0; i < elementCount; i++) {
        const margin = isMobile ? 20 : 15;
        let x, y;

        if (Math.random() > 0.5) {
          x = Math.random() > 0.5 ? margin : 100 - margin - 5;
          y = margin + Math.random() * (100 - 2 * margin);
        } else {
          x = margin + Math.random() * (100 - 2 * margin);
          y = Math.random() > 0.5 ? margin : 100 - margin - 5;
        }

        newElements.push({
          id: `floating-${i}`,
          x: x,
          y: y,
          delay: Math.random() * 5,
          duration: Math.random() * 10 + 15,
        });
      }

      return newElements;
    };

    setElements(generateElements());

    const handleResize = () => {
      setElements(generateElements());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">

      {/* Futuristic floating data displays */}
      {elements.map((element, index) => {
        const dataOptions = [
          { text: '24/7 ONLINE', color: 'text-accent', border: 'border-accent/40' },
          { text: 'AI ACTIVE', color: 'text-primary', border: 'border-primary/40' },
          { text: 'SCALABLE', color: 'text-secondary', border: 'border-secondary/40' },
          { text: '391% BOOST', color: 'text-accent', border: 'border-accent/40' },
          { text: 'AUTOMATED', color: 'text-primary', border: 'border-primary/40' }
        ];
        const data = dataOptions[index % dataOptions.length];

        return (
          <div
            key={element.id}
            className="absolute animate-float opacity-70"
            style={{
              left: `${element.x}%`,
              top: `${element.y}%`,
              animationDelay: `${element.delay}s`,
              animationDuration: `${element.duration}s`,
            }}
          >
            <div className={`data-display ${data.border} glow-text`}>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 ${data.color.replace('text-', 'bg-')} rounded-full animate-pulse`}></div>
                <span className={`${data.color} font-mono text-xs font-bold tracking-wider`}>
                  {data.text}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FloatingTradieElements;
