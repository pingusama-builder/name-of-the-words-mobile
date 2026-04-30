import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import type { Word } from "@shared/schema";

export default function QueueView() {
  const queryClient = useQueryClient();
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [resolveMode, setResolveMode] = useState<"normal" | "work" | "mutual-arising">("normal");

  // Fetch queued words (isQueued = 1)
  const { data: queuedWords = [], isLoading } = useQuery<Word[]>({
    queryKey: ["/api/words", "queued"],
    queryFn: () =>
      apiRequest("GET", "/api/words?queued=1").then(r => r.json()),
  });

  // Sort by createdAt (newest first)
  const sortedWords = [...queuedWords].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  // Mutation to resolve a queued entry
  const resolveMutation = useMutation({
    mutationFn: async (wordId: number) => {
      const res = await apiRequest("PATCH", `/api/words/${wordId}`, {
        isQueued: 0,
        sourceMode: resolveMode,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/words"] });
      setSelectedWordId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading queue...</p>
      </div>
    );
  }

  if (queuedWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground text-lg">Queue is empty</p>
        <p className="text-xs text-muted-foreground/50 mt-2">Use Quick Save to add words to explore later</p>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-4">
      <div className="px-4 mb-6">
        <h1 className="text-2xl font-serif font-light text-foreground">To Be Explored</h1>
        <p className="text-xs text-muted-foreground/60 mt-1">{queuedWords.length} queued</p>
      </div>

      <AnimatePresence mode="popLayout">
        {sortedWords.map((word, idx) => (
          <motion.div
            key={word.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: idx * 0.05 }}
            className="px-4 mb-3"
          >
            <button
              onClick={() => setSelectedWordId(word.id)}
              className="w-full text-left p-4 rounded-lg border border-border/30 hover:border-border/60
                bg-card/20 hover:bg-card/40 transition-all duration-200"
            >
              <h3 className="font-serif text-lg text-foreground">{word.word}</h3>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Added {new Date(word.createdAt).toLocaleDateString()}
              </p>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Resolve dialog */}
      {selectedWordId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedWordId(null)}
          className="fixed inset-0 bg-black/50 flex items-end z-50"
        >
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            onClick={e => e.stopPropagation()}
            className="w-full bg-background border-t border-border/30 rounded-t-2xl p-6"
          >
            <h2 className="text-lg font-serif text-foreground mb-4">Complete Entry</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Choose where to save this word:
            </p>

            <div className="space-y-3 mb-6">
              {(["normal", "work", "mutual-arising"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setResolveMode(mode)}
                  className={`w-full p-3 rounded-lg border transition-all ${
                    resolveMode === mode
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-card/20 border-border/30 text-muted-foreground hover:border-border/60"
                  }`}
                >
                  {mode === "normal" && "Normal Collection"}
                  {mode === "work" && "Work Mode"}
                  {mode === "mutual-arising" && "Mutual-Arising"}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedWordId(null)}
                className="flex-1 py-2 rounded-lg border border-border/30 text-muted-foreground
                  hover:bg-card/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveMutation.mutate(selectedWordId)}
                disabled={resolveMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-primary/15 text-primary border border-primary/25
                  hover:bg-primary/25 transition-colors disabled:opacity-50"
              >
                {resolveMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
