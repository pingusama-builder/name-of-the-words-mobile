import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Word } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import CircularDial from "@/components/CircularDial";
import { apiRequest } from "@/lib/queryClient";
import EditWord from "@/pages/EditWord";

interface WordDetailProps {
  word: Word;
  onClose: () => void;
}

const LANG_LABELS: Record<string, string> = {
  cantonese: "Cantonese 粵語",
  mandarin: "Mandarin 普通話",
  english: "English",
  other: "Other",
};

export default function WordDetail({ word, onClose }: WordDetailProps) {
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [currentWord, setCurrentWord] = useState<Word>(word);

  const tags: string[] = (() => {
    try { return JSON.parse(currentWord.tags || "[]"); }
    catch { return []; }
  })();

  const hasMatch = currentWord.pairedWord;
  const matchScore = hasMatch
    ? Math.round(
        ((currentWord.ratingEssence || 0) + (currentWord.ratingBeauty || 0) + (currentWord.ratingSubtlety || 0)) / 36 * 100
      )
    : 0;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/words/${word.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/words"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
    },
  });

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      deleteMutation.mutate(undefined, {
        onSettled: () => onClose(),
      });
    }, 500);
  };

  return (
    <>
      {/* Detail sheet */}
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Sheet */}
        <motion.div
          className="relative w-full max-w-md bg-card border-t border-border/30 rounded-t-2xl
            max-h-[85vh] overflow-y-auto pb-8"
          initial={{ y: "100%" }}
          animate={isDeleting ? { y: "100%", opacity: 0, scale: 0.9 } : { y: 0 }}
          exit={{ y: "100%" }}
          transition={isDeleting
            ? { duration: 0.5, ease: [0.4, 0, 1, 1] }
            : { type: "spring", damping: 30, stiffness: 300 }
          }
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-4">
            <div className="w-8 h-1 rounded-full bg-border/50" />
          </div>

          <div className="px-6">
            {/* Word header */}
            <div className="flex items-start justify-between mb-1">
              <h2 className="font-serif text-xl text-foreground">{currentWord.word}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">
                  {LANG_LABELS[currentWord.originLanguage] || currentWord.originLanguage}
                </span>
                <button
                  onClick={() => setShowEdit(true)}
                  className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
                  aria-label="Edit word"
                  data-testid="btn-edit-word"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9.5 1.5l3 3L4 13H1v-3L9.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Date */}
            <p className="text-xs text-muted-foreground/50 mb-4">{currentWord.dateAdded}</p>

            {/* Paired word */}
            {currentWord.pairedWord && (
              <div className="mb-5 p-3 rounded-xl border border-primary/15 bg-primary/5">
                <p className="text-xs text-muted-foreground/60 mb-1.5 uppercase tracking-wider">Perfect Match</p>
                <div className="flex items-center gap-3">
                  <span className="text-base text-foreground">{currentWord.word}</span>
                  <svg width="20" height="12" viewBox="0 0 20 12" fill="none" className="text-primary/40">
                    <path d="M0 6h20M16 1l4 5-4 5" stroke="currentColor" strokeWidth="1" />
                    <path d="M20 6H0M4 1L0 6l4 5" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  <span className="text-base text-foreground">{currentWord.pairedWord}</span>
                </div>
                {currentWord.pairedMeaning && (
                  <p className="text-xs text-muted-foreground/60 mt-1.5">{currentWord.pairedMeaning}</p>
                )}
                {/* Match meter */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-border/30 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary/50"
                      initial={{ width: 0 }}
                      animate={{ width: `${matchScore}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                    />
                  </div>
                  <span className="text-xs text-primary/70">{matchScore}%</span>
                </div>
              </div>
            )}

            {/* Meaning */}
            {currentWord.meaning && (
              <div className="mb-5">
                <p className="text-xs text-muted-foreground/50 mb-1 uppercase tracking-wider">Meaning</p>
                <p className="text-sm text-foreground/80">{currentWord.meaning}</p>
              </div>
            )}

            {/* Context */}
            {currentWord.context && (
              <div className="mb-5">
                <p className="text-xs text-muted-foreground/50 mb-1 uppercase tracking-wider">Context</p>
                <p className="text-sm text-foreground/60 italic">"{currentWord.context}"</p>
              </div>
            )}

            {/* Rating dials — read-only display */}
            <div className="flex justify-around mb-5 py-2">
              <CircularDial value={currentWord.ratingEssence || 0} onChange={() => {}} label="Essence" color="#4fb8a3" size={72} />
              <CircularDial value={currentWord.ratingBeauty || 0} onChange={() => {}} label="Beauty" color="#9b7fd4" size={72} />
              <CircularDial value={currentWord.ratingSubtlety || 0} onChange={() => {}} label="Subtlety" color="#d4a34f" size={72} />
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-muted-foreground/50 mb-2 uppercase tracking-wider">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs bg-muted/30 text-muted-foreground border-none px-2.5 py-0.5">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Delete section */}
            <div className="border-t border-border/20 pt-4">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 rounded-xl text-sm text-muted-foreground/60
                    border border-border/20 transition-all duration-200
                    hover:text-destructive/70 hover:border-destructive/20 hover:bg-destructive/5"
                  data-testid="btn-delete-prompt"
                >
                  Remove word
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground
                      border border-border/30 hover:bg-muted/20 transition-colors"
                    data-testid="btn-delete-cancel"
                  >
                    Keep
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl text-sm text-destructive
                      border border-destructive/30 bg-destructive/10
                      hover:bg-destructive/20 transition-colors
                      disabled:opacity-50"
                    data-testid="btn-delete-confirm"
                  >
                    {isDeleting ? "Dissolving..." : "Remove"}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Edit sheet — rendered above the detail sheet */}
      <AnimatePresence>
        {showEdit && (
          <EditWord
            word={currentWord}
            onClose={() => setShowEdit(false)}
            onSaved={(updated) => {
              setCurrentWord(updated);
              setShowEdit(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
