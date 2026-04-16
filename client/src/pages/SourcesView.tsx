import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { Word } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import SourceDeck from "@/components/SourceDeck";

interface SourceEntry {
  name: string;
  wordCount: number;
  latestDate: string;
  colors: string[];
}

interface SourcesViewProps {
  onSelectForShare?: (wordIds: number[]) => void;
}

export default function SourcesView({ onSelectForShare }: SourcesViewProps) {
  const [activeDeck, setActiveDeck] = useState<string | null>(null);

  const { data: allWords = [], isLoading } = useQuery<Word[]>({
    queryKey: ["/api/words"],
    queryFn: () => apiRequest("GET", "/api/words").then(r => r.json()),
  });

  // Aggregate words by source
  const sourceMap = new Map<string, { words: Word[] }>();
  for (const w of allWords) {
    if (!w.source?.trim()) continue;
    const key = w.source.trim();
    if (!sourceMap.has(key)) sourceMap.set(key, { words: [] });
    sourceMap.get(key)!.words.push(w);
  }

  const sources: SourceEntry[] = Array.from(sourceMap.entries())
    .map(([name, { words }]) => ({
      name,
      wordCount: words.length,
      latestDate: words.reduce((latest, w) => w.dateAdded > latest ? w.dateAdded : latest, ""),
      colors: words
        .filter(w => w.color)
        .slice(0, 5)
        .map(w => w.color as string),
    }))
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate));

  const wordsWithoutSource = allWords.filter(w => !w.source?.trim()).length;

  return (
    <>
      <div className="pt-2 pb-4">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-base text-foreground/90 tracking-wide">Sources</h2>
            <p className="text-xs text-muted-foreground/50 mt-0.5">
              {sources.length} {sources.length === 1 ? "source" : "sources"} · {allWords.length - wordsWithoutSource} words
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-card/30 animate-pulse" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center pt-16 text-center"
          >
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="mb-4 opacity-20">
              <rect x="12" y="8" width="40" height="48" rx="3" stroke="hsl(188 35% 47%)" strokeWidth="1.5" fill="none" />
              <path d="M20 20h24M20 28h24M20 36h16" stroke="hsl(188 35% 47%)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-muted-foreground/60 mb-1">No sources yet</p>
            <p className="text-xs text-muted-foreground/40">
              Add a source when saving words to group them here
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <AnimatePresence>
              {sources.map((src, i) => (
                <motion.button
                  key={src.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => setActiveDeck(src.name)}
                  className="w-full text-left rounded-xl border border-border/30 bg-card/40
                    hover:bg-card/70 hover:border-border/50 transition-all duration-200 p-4 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {/* Color swatches from words in this source */}
                        {src.colors.length > 0 && (
                          <div className="flex gap-0.5 shrink-0">
                            {src.colors.map((color, ci) => (
                              <div
                                key={ci}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        )}
                        <h3 className="text-sm font-medium text-foreground/90 truncate">{src.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground/50">
                          {src.wordCount} {src.wordCount === 1 ? "word" : "words"}
                        </span>
                        {src.latestDate && (
                          <>
                            <span className="text-muted-foreground/25">·</span>
                            <span className="text-xs text-muted-foreground/40">{src.latestDate}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg
                      width="16" height="16" viewBox="0 0 16 16" fill="none"
                      className="shrink-0 ml-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors"
                    >
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>

            {/* Words without source note */}
            {wordsWithoutSource > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: sources.length * 0.05 + 0.1 }}
                className="text-xs text-muted-foreground/30 text-center pt-2"
              >
                {wordsWithoutSource} {wordsWithoutSource === 1 ? "word" : "words"} without a source
              </motion.p>
            )}
          </div>
        )}
      </div>

      {/* Source deck overlay */}
      <AnimatePresence>
        {activeDeck && (
          <SourceDeck
            source={activeDeck}
            onClose={() => setActiveDeck(null)}
            onShareAll={onSelectForShare ? (ids) => {
              setActiveDeck(null);
              onSelectForShare(ids);
            } : undefined}
          />
        )}
      </AnimatePresence>
    </>
  );
}
