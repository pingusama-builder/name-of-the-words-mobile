import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { Word } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import WordDetail from "@/pages/WordDetail";

interface SourceDeckProps {
  source: string;
  onClose: () => void;
}

export default function SourceDeck({ source, onClose }: SourceDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  const { data: allWords = [], isLoading } = useQuery<Word[]>({
    queryKey: ["/api/words"],
    queryFn: () => apiRequest("GET", "/api/words").then(r => r.json()),
  });

  // Filter words for this source, sort by locationOrder ASC (nulls last), then by dateAdded
  const sourceWords = allWords
    .filter(w => w.source === source)
    .sort((a, b) => {
      const aOrder = a.locationOrder ?? Infinity;
      const bOrder = b.locationOrder ?? Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.dateAdded.localeCompare(b.dateAdded);
    });

  const total = sourceWords.length;
  const currentWord = sourceWords[currentIndex];

  const goNext = () => {
    if (currentIndex < total - 1) {
      setDirection(1);
      setCurrentIndex(i => i + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(i => i - 1);
    }
  };

  // Swipe gesture handling
  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    if (info.offset.x < -50) goNext();
    else if (info.offset.x > 50) goPrev();
  };

  const LANG_LABELS: Record<string, string> = {
    cantonese: "粵",
    mandarin: "中",
    english: "EN",
    other: "⋯",
  };

  const parseTags = (tagsStr: string | null): string[] => {
    try { return JSON.parse(tagsStr || "[]"); }
    catch { return []; }
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col bg-background"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/20">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex flex-col items-center">
            <p className="text-xs text-muted-foreground/50 uppercase tracking-[0.2em] mb-0.5">Source</p>
            <h2 className="font-serif text-sm text-foreground/90 max-w-[200px] truncate text-center">{source}</h2>
          </div>

          <div className="text-xs text-muted-foreground/50 tabular-nums min-w-[40px] text-right">
            {total > 0 ? `${currentIndex + 1} / ${total}` : "0"}
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="h-0.5 bg-border/20">
            <motion.div
              className="h-full bg-primary/40"
              animate={{ width: `${((currentIndex + 1) / total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* Main deck area */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-3 w-full max-w-sm">
              {[1, 2].map(i => (
                <div key={i} className="h-40 rounded-2xl bg-card/30 animate-pulse" />
              ))}
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-center text-center">
              <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="mb-4 opacity-20">
                <rect x="28" y="28" width="8" height="8" fill="hsl(188 35% 47%)" rx="1" transform="rotate(45 32 32)" />
              </svg>
              <p className="text-sm text-muted-foreground/60">No words from this source yet</p>
            </div>
          ) : (
            <div className="w-full max-w-sm relative">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={{
                    enter: (d: number) => ({ x: d * 60, opacity: 0, scale: 0.96 }),
                    center: { x: 0, opacity: 1, scale: 1 },
                    exit: (d: number) => ({ x: d * -60, opacity: 0, scale: 0.96 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedWord(currentWord)}
                  className="cursor-pointer"
                >
                  {/* Word card */}
                  <div
                    className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm select-none"
                    style={{ borderLeftColor: currentWord.color || undefined, borderLeftWidth: currentWord.color ? 3 : undefined }}
                  >
                    {/* Location badge */}
                    {currentWord.location && (
                      <p className="text-xs text-muted-foreground/40 mb-3 uppercase tracking-wider">
                        {currentWord.location}
                      </p>
                    )}

                    {/* Word + language */}
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-serif text-2xl text-foreground leading-tight">{currentWord.word}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted/40 text-muted-foreground/60 shrink-0 ml-3 mt-1">
                        {LANG_LABELS[currentWord.originLanguage] || currentWord.originLanguage}
                      </span>
                    </div>

                    {/* Meaning */}
                    {currentWord.meaning && (
                      <p className="text-sm text-foreground/70 mb-3 leading-relaxed">{currentWord.meaning}</p>
                    )}

                    {/* Context */}
                    {currentWord.context && (
                      <p className="text-xs text-muted-foreground/50 italic mb-3 leading-relaxed">
                        &ldquo;{currentWord.context}&rdquo;
                      </p>
                    )}

                    {/* Tags */}
                    {parseTags(currentWord.tags).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {parseTags(currentWord.tags).map(tag => (
                          <span key={tag} className="text-xs bg-primary/8 text-primary/60 px-2 py-0.5 rounded-full border border-primary/15">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tap hint */}
                    <p className="text-xs text-muted-foreground/25 mt-4 text-right">tap for details</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Navigation controls */}
        {total > 1 && (
          <div className="flex items-center justify-between px-8 pb-8 pt-4">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="w-12 h-12 rounded-full border border-border/30 flex items-center justify-center
                text-muted-foreground hover:text-foreground hover:border-border/60 transition-all
                disabled:opacity-20 disabled:cursor-not-allowed"
              aria-label="Previous word"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              {sourceWords.slice(Math.max(0, currentIndex - 3), Math.min(total, currentIndex + 4)).map((_, i) => {
                const actualIndex = Math.max(0, currentIndex - 3) + i;
                return (
                  <button
                    key={actualIndex}
                    onClick={() => {
                      setDirection(actualIndex > currentIndex ? 1 : -1);
                      setCurrentIndex(actualIndex);
                    }}
                    className={`rounded-full transition-all duration-200 ${
                      actualIndex === currentIndex
                        ? "w-4 h-1.5 bg-primary/60"
                        : "w-1.5 h-1.5 bg-border/50 hover:bg-border"
                    }`}
                    aria-label={`Go to word ${actualIndex + 1}`}
                  />
                );
              })}
            </div>

            <button
              onClick={goNext}
              disabled={currentIndex === total - 1}
              className="w-12 h-12 rounded-full border border-border/30 flex items-center justify-center
                text-muted-foreground hover:text-foreground hover:border-border/60 transition-all
                disabled:opacity-20 disabled:cursor-not-allowed"
              aria-label="Next word"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Swipe hint for single word or first view */}
        {total > 1 && (
          <p className="text-xs text-muted-foreground/25 text-center pb-4 -mt-2">
            swipe or tap arrows to navigate
          </p>
        )}
      </motion.div>

      {/* Word detail overlay */}
      <AnimatePresence>
        {selectedWord && (
          <WordDetail word={selectedWord} onClose={() => setSelectedWord(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
