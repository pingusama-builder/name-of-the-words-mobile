import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { Word, Tag } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import WordCard from "@/components/WordCard";

interface TagCloudProps {
  onSelectWord: (word: Word) => void;
  isWorkMode?: boolean;
}

// Color palette for tags, cycling through jewel tones
const TAG_COLORS = [
  "hsl(188 35% 47%)", // teal
  "hsl(280 40% 60%)", // purple
  "hsl(45 60% 55%)",  // gold
  "hsl(330 40% 55%)", // pink
  "hsl(140 35% 50%)", // green
  "hsl(210 45% 55%)", // blue
  "hsl(20 55% 55%)",  // amber
];

export default function TagCloud({ onSelectWord, isWorkMode = false }: TagCloudProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const modeParam = `isWork=${isWorkMode}`;

  const { data: allWords = [] } = useQuery<Word[]>({
    queryKey: ["/api/words", modeParam],
    queryFn: () => apiRequest("GET", `/api/words?${modeParam}`).then(r => r.json()),
  });

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    queryFn: () => apiRequest("GET", "/api/tags").then(r => r.json()),
  });

  const { data: tagWords = [] } = useQuery<Word[]>({
    queryKey: ["/api/words/tag", selectedTag, modeParam],
    queryFn: () =>
      selectedTag
        ? apiRequest("GET", `/api/words/tag/${encodeURIComponent(selectedTag)}?${modeParam}`).then(r => r.json())
        : Promise.resolve([]),
    enabled: !!selectedTag,
  });

  // Count words per tag (from allWords, not allTags)
  const tagCounts = new Map<string, number>();
  for (const word of allWords) {
    try {
      const tags: string[] = JSON.parse(word.tags || "[]");
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    } catch { /* skip */ }
  }

  // Sort by count
  const sortedTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  const maxCount = sortedTags.length > 0 ? sortedTags[0][1] : 1;

  if (sortedTags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 text-center">
        <svg width="40" height="40" viewBox="0 0 20 20" fill="none" className="mb-3 opacity-30">
          <path d="M3 10l7-7h7v7l-7 7z" stroke="hsl(188 35% 47%)" strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="13.5" cy="6.5" r="1.5" fill="hsl(188 35% 47%)" />
        </svg>
        <p className="text-sm text-muted-foreground mb-1">No tags yet</p>
        <p className="text-xs text-muted-foreground/50">Tags appear here as you add words</p>
      </div>
    );
  }

  return (
    <div className="pt-2">
      {/* Cloud */}
      <div className="flex flex-wrap gap-2 justify-center mb-6 py-4">
        {sortedTags.map(([tag, count], i) => {
          const ratio = count / maxCount;
          const fontSize = 0.75 + ratio * 0.75; // 0.75rem to 1.5rem
          const color = TAG_COLORS[i % TAG_COLORS.length];
          const isSelected = tag === selectedTag;

          return (
            <motion.button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-3 py-1 rounded-full transition-all duration-300 border ${
                isSelected
                  ? "bg-primary/15 border-primary/30"
                  : "bg-card/30 border-border/20 hover:border-border/40"
              }`}
              style={{
                fontSize: `${fontSize}rem`,
                color: isSelected ? color : undefined,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              animate={{
                opacity: isSelected ? 1 : 0.6 + ratio * 0.4,
              }}
              data-testid={`tag-${tag}`}
            >
              <span className={isSelected ? "" : "text-muted-foreground"}>
                {tag}
              </span>
              <span className="ml-1.5 text-xs text-muted-foreground/50">
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Tag results */}
      {selectedTag && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="border-t border-border/20 pt-4">
            <p className="text-xs text-muted-foreground/60 mb-3 uppercase tracking-wider">
              {selectedTag} ({tagWords.length})
            </p>
            <div className="flex flex-col gap-2">
              {tagWords.map((word) => (
                <WordCard key={word.id} word={word} onClick={() => onSelectWord(word)} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
