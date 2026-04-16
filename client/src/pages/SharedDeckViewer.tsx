import { useState, useRef } from "react";
import { useRoute } from "wouter";
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from "framer-motion";
import type { Word } from "@shared/schema";

interface SharedDeckData {
  deck: {
    id: number;
    token: string;
    title: string | null;
    wordIds: string;
    ownerUserId: string;
    createdAt: string;
  };
  words: Word[];
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const max = 15;
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground/50 w-14 shrink-0 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-border/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/50 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground/40 w-6 text-right">{value}</span>
    </div>
  );
}

function SwipeCard({
  word,
  onSwipeLeft,
  onSwipeRight,
  isTop,
}: {
  word: Word;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const controls = useAnimation();
  const [expanded, setExpanded] = useState(false);
  const tags: string[] = (() => {
    try { return JSON.parse(word.tags || "[]"); } catch { return []; }
  })();

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -80) {
      controls.start({ x: -400, opacity: 0, transition: { duration: 0.3 } }).then(onSwipeLeft);
    } else if (info.offset.x > 80) {
      controls.start({ x: 400, opacity: 0, transition: { duration: 0.3 } }).then(onSwipeRight);
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 25 } });
    }
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity }}
      animate={controls}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      onClick={() => isTop && setExpanded(!expanded)}
    >
      <div className="h-full bg-card border border-border/40 rounded-2xl overflow-hidden flex flex-col shadow-lg">
        {/* Word header */}
        <div className="flex-1 flex flex-col justify-center px-7 pt-10 pb-6 min-h-0">
          <div className="mb-1">
            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em]">
              {word.originLanguage}
            </span>
          </div>
          <h2 className="font-serif text-3xl text-foreground/90 mb-3 leading-tight">{word.word}</h2>
          {word.pairedWord && (
            <p className="text-base text-muted-foreground/60 font-serif italic mb-3">{word.pairedWord}</p>
          )}
          <p className="text-sm text-muted-foreground/80 leading-relaxed">{word.meaning}</p>

          {/* Context — shown when expanded */}
          <AnimatePresence>
            {expanded && word.context && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <p className="text-xs text-muted-foreground/60 leading-relaxed mt-3 pt-3 border-t border-border/20 italic">
                  "{word.context}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {tags.map((tag: string) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary/70">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ratings */}
        <div className="px-7 pb-6 space-y-2 border-t border-border/20 pt-4">
          <RatingBar label="Essence" value={word.ratingEssence ?? 0} />
          <RatingBar label="Beauty" value={word.ratingBeauty ?? 0} />
          <RatingBar label="Subtlety" value={word.ratingSubtlety ?? 0} />
        </div>

        {/* Source / location */}
        {(word.source || word.location) && (
          <div className="px-7 pb-5 flex items-center gap-2 text-[10px] text-muted-foreground/40">
            {word.source && <span className="font-medium">{word.source}</span>}
            {word.source && word.location && <span>·</span>}
            {word.location && <span>{word.location}</span>}
          </div>
        )}

        {/* Tap hint */}
        {isTop && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
            <span className="text-[9px] text-muted-foreground/25 tracking-wider">tap to {expanded ? "collapse" : "expand"} · swipe to continue</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function SharedDeckViewer() {
  const [, params] = useRoute("/share/:token");
  const token = params?.token;

  const [data, setData] = useState<SharedDeckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const fetchedRef = useRef(false);

  // Fetch deck data once
  if (!fetchedRef.current && token) {
    fetchedRef.current = true;
    fetch(`/api/share/${token}`)
      .then(r => {
        if (!r.ok) throw new Error("Deck not found or has been revoked");
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }

  const handleNext = (dir: "left" | "right") => {
    setDirection(dir);
    setCurrentIndex(i => i + 1);
  };

  const words = data?.words ?? [];
  const remaining = words.length - currentIndex;
  const isFinished = currentIndex >= words.length;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 64 64" fill="none" className="shrink-0">
            <path d="M12 48 C12 24, 20 16, 32 12 C44 16, 52 24, 52 48" stroke="hsl(188 35% 47%)" strokeWidth="1.5" fill="none" opacity="0.6" />
            <path d="M16 46 C16 28, 22 20, 32 16 C42 20, 48 28, 48 46" stroke="hsl(188 35% 57%)" strokeWidth="1.2" fill="none" opacity="0.4" />
            <rect x="28" y="28" width="8" height="8" fill="hsl(188 35% 47%)" opacity="0.7" rx="1" transform="rotate(45 32 32)" />
          </svg>
          <div className="flex flex-col leading-none">
            <span className="font-serif text-xs text-foreground/80 tracking-wide">Name of the Words</span>
            <span className="text-[9px] text-muted-foreground/50 tracking-[0.18em] uppercase mt-0.5">言之名</span>
          </div>
        </div>
        <a
          href="/"
          className="text-xs text-primary/70 hover:text-primary transition-colors border border-primary/30 px-3 py-1 rounded-full"
        >
          Start collecting
        </a>
      </header>

      {/* Deck title */}
      {data && (
        <div className="px-5 pt-4 pb-2 shrink-0">
          <h1 className="font-serif text-lg text-foreground/90">
            {data.deck.title || "Shared deck"}
          </h1>
          <p className="text-xs text-muted-foreground/50 mt-0.5">
            {words.length} {words.length === 1 ? "word" : "words"}
            {!isFinished && ` · ${remaining} remaining`}
          </p>
        </div>
      )}

      {/* Main area */}
      <main className="flex-1 px-5 pb-5 min-h-0 flex flex-col">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="mb-4 opacity-30">
              <rect x="28" y="28" width="8" height="8" fill="hsl(188 35% 47%)" rx="1" transform="rotate(45 32 32)" />
              <path d="M12 48 C12 24, 20 16, 32 12 C44 16, 52 24, 52 48" stroke="hsl(188 35% 47%)" strokeWidth="1.5" fill="none" />
            </svg>
            <p className="text-muted-foreground text-sm mb-1">Deck unavailable</p>
            <p className="text-muted-foreground/50 text-xs">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {isFinished ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M6 14l5 5 11-11" stroke="hsl(188 35% 57%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="font-serif text-xl text-foreground/80 mb-2">All words seen</h2>
                <p className="text-xs text-muted-foreground/50 mb-6">You've been through the full deck.</p>
                <button
                  onClick={() => setCurrentIndex(0)}
                  className="px-5 py-2.5 rounded-full border border-primary/30 text-primary text-sm hover:bg-primary/10 transition-colors"
                >
                  Start over
                </button>
              </div>
            ) : (
              <div className="flex-1 relative mt-2">
                {/* Stack of cards (show up to 3 behind) */}
                {[2, 1, 0].map((offset) => {
                  const idx = currentIndex + offset;
                  if (idx >= words.length) return null;
                  const word = words[idx];
                  return (
                    <motion.div
                      key={word.id}
                      className="absolute inset-0"
                      style={{
                        scale: offset === 0 ? 1 : 1 - offset * 0.03,
                        y: offset === 0 ? 0 : offset * 10,
                        zIndex: 10 - offset,
                      }}
                      animate={{
                        scale: offset === 0 ? 1 : 1 - offset * 0.03,
                        y: offset === 0 ? 0 : offset * 10,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <SwipeCard
                        word={word}
                        isTop={offset === 0}
                        onSwipeLeft={() => handleNext("left")}
                        onSwipeRight={() => handleNext("right")}
                      />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Progress bar */}
      {data && words.length > 0 && (
        <div className="px-5 pb-6 shrink-0">
          <div className="h-0.5 rounded-full bg-border/30 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary/40"
              animate={{ width: `${(currentIndex / words.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/30 text-center mt-2 tracking-wider">
            {currentIndex} / {words.length}
          </p>
        </div>
      )}
    </div>
  );
}
