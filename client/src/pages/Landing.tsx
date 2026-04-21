import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

interface Stats {
  seekers: number;
  wordsNamed: number;
}

interface Quote {
  text: string;
  attr: string;
}

const QUOTES: Quote[] = [
  {
    text: "For magic consists in this, the true <em>naming</em> of a thing.",
    attr: "A Wizard of Earthsea — Ursula K. Le Guin"
  },
  {
    text: "The limits of my language mean the limits of my <em>world</em>.",
    attr: "Tractatus Logico-Philosophicus — Ludwig Wittgenstein"
  },
  {
    text: "道可道，<em>非常道</em>。名可名，非常名。",
    attr: "道德經 — 老子"
  },
  {
    text: "To name is to <em>evoke</em>. And in evoking, to understand.",
    attr: "Name of the Words"
  },
  {
    text: "Some words reveal themselves only through <em>prolonged contemplation</em>.",
    attr: ""
  }
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {}); // silent fail — stats are decorative
  }, []);

  useEffect(() => {
    // Show first quote after 900ms
    setTimeout(() => {
      setQuote(QUOTES[0]);
      setQuoteIndex(0);
    }, 900);

    // Rotate quotes every 9 seconds
    const interval = setInterval(() => {
      setQuoteIndex(prev => {
        const next = (prev + 1) % QUOTES.length;
        setQuote(QUOTES[next]);
        return next;
      });
    }, 9000);

    return () => clearInterval(interval);
  }, []);

  // Animate number count-up
  useEffect(() => {
    if (!stats) return;

    const animateCount = (element: HTMLElement, target: number, duration: number, delay: number) => {
      setTimeout(() => {
        let current = 0;
        const step = target / (duration / 16);
        const tick = () => {
          current = Math.min(current + step, target);
          element.textContent = Math.round(current).toLocaleString();
          if (current < target) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, delay);
    };

    const seekersEl = document.getElementById('seekers-count');
    const wordsEl = document.getElementById('words-count');
    if (seekersEl) animateCount(seekersEl, stats.seekers, 600, 1900);
    if (wordsEl) animateCount(wordsEl, stats.wordsNamed, 1100, 1900);
  }, [stats]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: "hsl(220, 15%, 6%)",
      }}
    >
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          [188, 30, 44],
          [210, 22, 44],
          [245, 18, 46],
          [270, 18, 48],
          [330, 18, 44],
          [155, 22, 40],
          [200, 20, 42],
          [220, 15, 38],
          [290, 16, 46]
        ].map(([h, s, l], i) => {
          const sz = 2 + Math.random() * 2.8;
          const lf = 8 + Math.random() * 84;
          const tp = 15 + Math.random() * 72;
          const dr = 14 + i * 2.4;
          const dl = -(Math.random() * dr);
          const dx = (Math.random() - 0.5) * 40;
          const pk = 0.1 + Math.random() * 0.18;

          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: sz,
                height: sz,
                background: `hsl(${h}, ${s}%, ${l}%)`,
                left: `${lf}%`,
                top: `${tp}%`,
              }}
              animate={{
                y: [-140, 0],
                x: [0, dx],
                opacity: [0, pk, pk, 0],
              }}
              transition={{
                duration: dr,
                delay: dl,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          );
        })}
      </div>

      {/* Main content stack */}
      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-md px-8">
        
        {/* Logo icon */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <svg width="44" height="52" viewBox="0 0 44 52" fill="none" stroke="currentColor" strokeWidth="1.1" className="text-teal-700/60">
            <path d="M4 50 L4 22 Q4 4 22 4 Q40 4 40 22 L40 50" strokeLinecap="round" />
            <path d="M11 50 L11 24 Q11 12 22 12 Q33 12 33 24 L33 50" strokeLinecap="round" opacity="0.3" />
            <rect x="19.5" y="0.5" width="5" height="5" rx="0.6" transform="rotate(45 22 3)" fill="currentColor" stroke="none" opacity="0.9" />
          </svg>
        </motion.div>

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-11"
        >
          <h1 className="font-serif text-2xl font-normal tracking-wider text-foreground mb-2">Name of the Words</h1>
          <p className="font-serif text-sm font-light tracking-widest text-muted-foreground">言之名</p>
        </motion.div>

        {/* Quote block */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mb-11 min-h-32 flex flex-col items-center justify-center"
        >
          {quote && (
            <>
              <motion.p
                key={`quote-${quoteIndex}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="font-serif text-lg font-light italic leading-relaxed text-foreground mb-3"
                dangerouslySetInnerHTML={{
                  __html: quote.text
                }}
              />
              <motion.p
                key={`attr-${quoteIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: quote.attr ? 1 : 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xs tracking-widest uppercase text-muted-foreground/50"
              >
                {quote.attr}
              </motion.p>
            </>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.9, ease: "easeOut" }}
          className="flex items-center gap-6 mb-11"
        >
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs tracking-widest uppercase text-muted-foreground/60 font-medium">Seekers</p>
            <p id="seekers-count" className="font-serif text-2xl font-light text-muted-foreground">0</p>
          </div>
          <div className="w-px h-6 bg-border/20" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs tracking-widest uppercase text-muted-foreground/60 font-medium">Words Named</p>
            <p id="words-count" className="font-serif text-2xl font-light text-muted-foreground">0</p>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.3, ease: "easeOut" }}
          className="flex flex-col items-center gap-0"
        >
          {/* Add button */}
          <button
            onClick={() => {
              sessionStorage.setItem('openView', 'add');
              navigate("/home");
            }}
            className="w-14 h-14 rounded-full border border-teal-600/30 flex items-center justify-center
              transition-all duration-300 hover:border-teal-500/60 hover:bg-teal-500/5 mb-1"
            aria-label="Add a word"
          >
            <span className="text-teal-700/80 text-xl font-serif hover:text-teal-600 transition-colors">+</span>
          </button>

          {/* Connector line */}
          <div className="w-px h-5 bg-border/20" />

          {/* Enter button */}
          <button
            onClick={() => navigate("/home")}
            className="w-13 h-13 rounded-full border border-border/50 flex items-center justify-center
              transition-all duration-300 hover:border-border hover:bg-foreground/5 mt-1"
            aria-label="Enter your collection"
          >
            <span className="text-muted-foreground text-lg font-serif hover:text-foreground transition-colors">→</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
