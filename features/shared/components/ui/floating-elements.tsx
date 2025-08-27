"use client";

import { motion } from "framer-motion";

// Configuration object for easy customization
const CONFIG = {
  particles: {
    count: 4,
    sizeRange: { min: 30, max: 50 },
    durationRange: { min: 4, max: 8 },
    maxDelay: 2,
  },
  gradients: {
    count: 3,
    durations: [8, 10, 6],
    delays: [0, 1, 2],
  },
  icons: {
    count: 4,
    size: 32, // 8 * 4 = 32px (w-8 h-8)
  },
  dots: {
    count: 6,
    size: 6, // 1.5 * 4 = 6px
    durationRange: { min: 8, max: 12 },
    maxDelay: 4,
  },
};

// Memorable Tradie-specific SVG icons and emojis
const TRADIE_ICONS = [
  // Power drill
  "M20 8h-3V4l-2-1-2-1H9L7 3l-2 1v4H2c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h3v4l2 1 2 1h4l2-1 2-1v-4h3c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2zm-8 8H8v-4h4v4z",

  // Toolbox
  "M20 6h-3V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM9 4h6v2H9V4zm11 6H4v-2h16v2z",

  // Truck/Ute
  "M20 8h-3l-1.5-3h-7L7 8H4c-1.1 0-2 .9-2 2v6h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-6c0-1.1-.9-2-2-2zM7 17.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm10 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",

  // Measuring tape
  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-13h-2v6l5.25 3.15.75-1.23-4.5-2.67V7z",

  // Safety vest
  "M12 2l-2 3H7v4h2v11h6V9h2V5h-3l-2-3zm0 2.5L13 6h-2l1-1.5z",

  // Level tool
  "M2 12h20v2H2v-2zm18-6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H4V8h16v8zm-8-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
];

interface FloatingElementsProps {
  className?: string;
  density?: "light" | "normal" | "heavy";
}

export function FloatingElements({
  className = "",
  density = "normal"
}: FloatingElementsProps) {
  // Adjust particle count based on density
  const densityMultiplier = density === "light" ? 0.5 : density === "heavy" ? 1.5 : 1;
  const particleCount = Math.floor(CONFIG.particles.count * densityMultiplier);

  // Generate particles with random properties
  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    size: Math.random() * (CONFIG.particles.sizeRange.max - CONFIG.particles.sizeRange.min) + CONFIG.particles.sizeRange.min,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * CONFIG.particles.maxDelay,
    duration: Math.random() * (CONFIG.particles.durationRange.max - CONFIG.particles.durationRange.min) + CONFIG.particles.durationRange.min,
  }));

  const gradientConfigs = [
    {
      className: "absolute top-20 -left-20 w-72 h-72 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-2xl",
      animate: {
        opacity: [0, 1, 0.8, 1],
        x: [0, 50, 0],
        y: [0, -30, 0],
        scale: [1, 1.1, 1],
      },
      duration: CONFIG.gradients.durations[0],
      delay: CONFIG.gradients.delays[0],
    },
    {
      className: "absolute top-1/3 -right-20 w-96 h-96 bg-gradient-to-l from-accent/15 to-primary/15 rounded-full blur-2xl",
      animate: {
        opacity: [0, 0.8, 0.6, 0.8],
        x: [0, -40, 0],
        y: [0, 40, 0],
        scale: [1, 0.9, 1],
      },
      duration: CONFIG.gradients.durations[1],
      delay: CONFIG.gradients.delays[1],
    },
    {
      className: "absolute bottom-20 left-1/4 w-64 h-64 bg-gradient-to-tr from-primary/10 to-accent/10 rounded-full blur-2xl",
      animate: {
        x: [0, 30, 0],
        y: [0, -20, 0],
        scale: [1, 1.2, 1],
      },
      duration: CONFIG.gradients.durations[2],
      delay: CONFIG.gradients.delays[2],
    },
  ];

  const dots = Array.from({ length: CONFIG.dots.count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * CONFIG.dots.maxDelay,
    duration: Math.random() * (CONFIG.dots.durationRange.max - CONFIG.dots.durationRange.min) + CONFIG.dots.durationRange.min,
  }));

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden z-10 ${className}`}>
      {/* Animated background gradients */}
      {gradientConfigs.map((config, index) => (
        <motion.div
          key={`gradient-${index}`}
          className={config.className}
          initial={{ opacity: 0 }}
          animate={config.animate}
          transition={{
            duration: config.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: config.delay,
          }}
        />
      ))}

      {/* Floating tradie icons */}
      {particles.slice(0, CONFIG.icons.count).map((particle, index) => (
        <motion.div
          key={`icon-${particle.id}`}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.4, 0],
            scale: [0, 1, 0],
            y: [-20, -40, -60],
            x: [0, Math.random() * 20 - 10, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        >
          <div className="w-8 h-8 text-primary/30">
            <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path d={TRADIE_ICONS[index % TRADIE_ICONS.length]} />
            </svg>
          </div>
        </motion.div>
      ))}

      {/* Floating particles */}
      {particles.slice(CONFIG.icons.count).map((particle) => (
        <motion.div
          key={`particle-${particle.id}`}
          className="absolute rounded-full bg-gradient-to-r from-primary/30 to-accent/30"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            opacity: [0, 0.6, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Pulse rings */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 1, opacity: 0 }}
        animate={{
          scale: [1, 2.5, 1],
          opacity: [0, 0.4, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="w-32 h-32 border-2 border-primary/30 rounded-full" />
      </motion.div>

      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 1, opacity: 0 }}
        animate={{
          scale: [1, 3, 1],
          opacity: [0, 0.3, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      >
        <div className="w-24 h-24 border-2 border-accent/25 rounded-full" />
      </motion.div>

            {/* Clean AI + Tradie Elements */}

      {/* Simple floating emojis - well spaced */}
      <motion.div
        className="absolute top-1/4 left-1/5"
        animate={{
          y: [0, -20, 0],
          rotate: [0, 10, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <span className="text-4xl">🤖</span>
      </motion.div>

      <motion.div
        className="absolute top-1/3 right-1/4"
        animate={{
          y: [0, -15, 0],
          x: [0, 10, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      >
        <span className="text-3xl">📅</span>
      </motion.div>

      <motion.div
        className="absolute bottom-1/3 left-1/6"
        animate={{
          y: [0, -12, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      >
        <span className="text-3xl">🔧</span>
      </motion.div>

      <motion.div
        className="absolute top-1/6 right-1/5"
        animate={{
          rotate: [0, 15, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      >
        <span className="text-2xl">⚡</span>
      </motion.div>

      <motion.div
        className="absolute bottom-1/4 right-1/6"
        animate={{
          y: [0, -8, 0],
          x: [0, -5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      >
        <span className="text-3xl">📱</span>
      </motion.div>

      {/* Subtle moving dots */}
      {dots.map((dot) => (
        <motion.div
          key={`dot-${dot.id}`}
          className="absolute w-2 h-2 bg-primary/15 rounded-full"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50],
            y: [0, Math.random() * 100 - 50],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            delay: dot.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
