import { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import type { Word } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface WordCardProps {
  word: Word;
  onClick?: () => void;
  animateEntry?: boolean;
  index?: number;
  onLanguageClick?: (language: string) => void;
  onTagClick?: (tag: string) => void;
}

const LANG_LABELS: Record<string, string> = {
  cantonese: "粵",
  mandarin: "中",
  english: "EN",
  other: "⋯",
};

const RATING_COLORS = {
  essence: "#4fb8a3",
  beauty: "#9b7fd4",
  subtlety: "#d4a34f",
};

function MiniDial({ value, color, label }: { value: number; color: string; label: string }) {
  const segments = 12;
  const r = 14;
  const center = 16;

  return (
    <div className="flex flex-col items-center gap-0.5" title={`${label}: ${value}/12`}>
      <svg width={32} height={32} viewBox="0 0 32 32">
        {Array.from({ length: segments }, (_, i) => {
          const startAngle = (i * 30 - 90) * (Math.PI / 180);
          const endAngle = ((i + 1) * 30 - 91) * (Math.PI / 180);
          const x1 = center + r * Math.cos(startAngle);
          const y1 = center + r * Math.sin(startAngle);
          const x2 = center + r * Math.cos(endAngle);
          const y2 = center + r * Math.sin(endAngle);
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={i < value ? color : "hsl(220 8% 18%)"}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={i < value ? 0.3 + (i / 12) * 0.7 : 0.2}
            />
          );
        })}
        <text
          x={center} y={center}
          textAnchor="middle" dominantBaseline="central"
          fill={value > 0 ? color : "hsl(40 3% 32%)"}
          fontSize={9} fontFamily="var(--font-sans)" fontWeight={500}
        >
          {value}
        </text>
      </svg>
    </div>
  );
}

function highlightWordInContext(context: string, word: string, windowSize: number = 30) {
  if (!context || !word) return null;
  const lowerContext = context.toLowerCase();
  const lowerWord = word.toLowerCase();
  const index = lowerContext.indexOf(lowerWord);
  if (index === -1) return null;
  const start = Math.max(0, index - windowSize);
  const end = Math.min(context.length, index + word.length + windowSize);
  const before = context.substring(start, index);
  const highlighted = context.substring(index, index + word.length);
  const after = context.substring(index + word.length, end);
  const hasEllipsisBefore = start > 0;
  const hasEllipsisAfter = end < context.length;
  return { before, highlighted, after, hasEllipsisBefore, hasEllipsisAfter };
}

const WordCard = forwardRef<HTMLDivElement, WordCardProps>(function WordCard({ word, onClick, animateEntry = false, index = 0, onLanguageClick, onTagClick }, _ref) {
  const [isPlucked, setIsPlucked] = useState(false);
  const tags: string[] = (() => {
    try { return JSON.parse(word.tags || "[]"); }
    catch { return []; }
  })();
  const contextHighlight = word.context ? highlightWordInContext(word.context, word.word) : null;

  const handleClick = () => {
    setIsPlucked(true);
    setTimeout(() => {
      setIsPlucked(false);
      onClick?.();
    }, 350);
  };

  return (
    <motion.div
      layout
      initial={animateEntry ? { opacity: 0, y: 16 } : false}
      animate={{
        opacity: 1,
        y: 0,
        scale: isPlucked ? 1.02 : 1,
        rotate: isPlucked ? -0.5 : 0,
      }}
      exit={{ opacity: 0, scale: 0.92, y: -8, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }}
      transition={
        isPlucked
          ? { type: "spring", damping: 18, stiffness: 400 }
          : animateEntry
            ? { duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }
            : { type: "spring", damping: 25, stiffness: 200 }
      }
      className="group relative p-4 rounded-xl border border-border/50 bg-card/60
        backdrop-blur-sm cursor-pointer
        transition-colors duration-300 ease-out
        hover:border-primary/30 hover:bg-card/80"
      style={isPlucked ? { boxShadow: "0 0 24px rgba(79,184,163,0.15)" } : undefined}
      onClick={handleClick}
      data-testid={`word-card-${word.id}`}
      ref={_ref as React.Ref<HTMLDivElement>}
    >
      {/* Top: word + language badge + optional Work badge */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-lg font-medium text-foreground leading-tight">
          {word.word}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {!!word.isQueued && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-orange-500/15 text-orange-400/80 border border-orange-500/20 tracking-wider uppercase font-medium leading-none">
              Queued
            </span>
          )}
          {word.sourceMode === "mutual-arising" && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-amber-500/15 text-amber-400/80 border border-amber-500/20 tracking-wider uppercase font-medium leading-none">
              Mutual-Arising
            </span>
          )}
          {!!word.isWork && !word.sourceMode?.includes("mutual") && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-blue-500/15 text-blue-400/80 border border-blue-500/20 tracking-wider uppercase font-medium leading-none">
              Work
            </span>
          )}
          <button
            className="text-xs px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium hover:bg-primary/20 hover:text-primary transition-colors"
            onClick={(e) => { e.stopPropagation(); onLanguageClick?.(word.originLanguage); }}
            title={`Filter by ${word.originLanguage}`}
          >
            {LANG_LABELS[word.originLanguage] || word.originLanguage}
          </button>
        </div>
      </div>

      {/* Paired word */}
      {word.pairedWord && (
        <div className="mb-2 text-sm text-primary/80 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          </svg>
          <span>{word.pairedWord}</span>
        </div>
      )}

      {/* Meaning */}
      {word.meaning && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {word.meaning}
        </p>
      )}

      {/* Rating dials — hidden for work-mode words */}
      {!word.isWork && (
        <div className="flex gap-3 mb-3">
          <MiniDial value={word.ratingEssence || 0} color={RATING_COLORS.essence} label="Essence" />
          <MiniDial value={word.ratingBeauty || 0} color={RATING_COLORS.beauty} label="Beauty" />
          <MiniDial value={word.ratingSubtlety || 0} color={RATING_COLORS.subtlety} label="Subtlety" />
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
              className="text-xs px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors"
              title={`Filter by ${tag}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Context with highlighted word (gold fill) */}
      {word.context && (
        <p className="mt-2 text-xs italic" style={{ color: '#7bbfbb' }}>
          "{contextHighlight ? (
            <>
              {contextHighlight.hasEllipsisBefore && <span>…</span>}
              {contextHighlight.before}
              <span className="font-semibold px-1 rounded" style={{ backgroundColor: 'rgba(232,175,52,0.2)', color: '#e8af34' }}>
                {contextHighlight.highlighted}
              </span>
              {contextHighlight.after}
              {contextHighlight.hasEllipsisAfter && <span>…</span>}
            </>
          ) : (
            <span className="line-clamp-1">{word.context}</span>
          )}"
        </p>
      )}
    </motion.div>
  );
});

export default WordCard;
