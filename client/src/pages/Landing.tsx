import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

interface Stats {
  seekers: number;
  wordsNamed: number;
}

export default function Landing() {
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {}); // silent fail — stats are decorative
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, hsl(220 15% 10%) 0%, hsl(220 15% 6%) 60%, hsl(220 18% 4%) 100%)",
      }}
    >
      {/* Subtle ambient particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 6 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 3 + Math.random() * 3,
              height: 3 + Math.random() * 3,
              background: `hsl(${180 + i * 30} 30% ${40 + i * 5}%)`,
              left: `${15 + Math.random() * 70}%`,
              top: `${20 + Math.random() * 60}%`,
            }}
            animate={{
              y: [-8, 8, -8],
              opacity: [0.15, 0.4, 0.15],
            }}
            transition={{
              duration: 4 + i * 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.6,
            }}
          />
        ))}
      </div>

      {/* Logo mark */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-label="Name of the Words">
          <path d="M12 48 C12 24, 20 16, 32 12 C44 16, 52 24, 52 48" stroke="hsl(188 35% 47%)" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M16 46 C16 28, 22 20, 32 16 C42 20, 48 28, 48 46" stroke="hsl(188 35% 57%)" strokeWidth="1.2" fill="none" opacity="0.4" />
          <path d="M32 12 L32 52" stroke="hsl(40 5% 50%)" strokeWidth="0.8" opacity="0.3" />
          <rect x="28" y="28" width="8" height="8" fill="hsl(188 35% 47%)" opacity="0.7" rx="1" transform="rotate(45 32 32)" />
        </svg>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif text-xl tracking-wide text-foreground mb-2"
      >
        Name of the Words
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-sm text-muted-foreground tracking-wider uppercase"
        style={{ letterSpacing: "0.2em" }}
      >
        言之名
      </motion.p>

      {/* Global stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: stats ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="flex items-center gap-5 mt-5 mb-10"
      >
        {stats && (
          <>
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground/35 uppercase tracking-[0.18em] mb-0.5">Seekers</p>
              <p className="font-serif text-base text-foreground/50">{stats.seekers.toLocaleString()}</p>
            </div>
            <div className="w-px h-6 bg-border/20" />
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground/35 uppercase tracking-[0.18em] mb-0.5">Words Named</p>
              <p className="font-serif text-base text-foreground/50">{stats.wordsNamed.toLocaleString()}</p>
            </div>
          </>
        )}
        {!stats && <div className="h-8" />}
      </motion.div>

      {/* Add word button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        onClick={() => { sessionStorage.setItem('openView', 'add'); navigate("/home"); }}
        className="group relative w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center
          transition-all duration-500 hover:border-primary/60 hover:bg-primary/5 mb-4"
        data-testid="add-button"
        aria-label="Add word"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary/70 group-hover:text-primary transition-colors duration-300">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </motion.button>

      {/* Enter button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        onClick={() => navigate("/home")}
        className="group relative w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center
          transition-all duration-500 hover:border-primary/60 hover:bg-primary/5"
        data-testid="enter-button"
        aria-label="Enter"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary/70 group-hover:text-primary transition-colors duration-300">
          <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>

      {/* Bottom subtle line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-12 w-24 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
      />
    </div>
  );
}
