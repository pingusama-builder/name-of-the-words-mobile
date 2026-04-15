import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import CircularDial from "@/components/CircularDial";
import type { Tag } from "@shared/schema";

interface AddWordProps {
  onComplete: () => void;
}

export default function AddWord({ onComplete }: AddWordProps) {
  const queryClient = useQueryClient();
  const [word, setWord] = useState("");
  const [originLanguage, setOriginLanguage] = useState("english");
  const [meaning, setMeaning] = useState("");
  const [context, setContext] = useState("");
  const [ratingEssence, setRatingEssence] = useState(0);
  const [ratingBeauty, setRatingBeauty] = useState(0);
  const [ratingSubtlety, setRatingSubtlety] = useState(0);
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pairedWord, setPairedWord] = useState("");
  const [pairedMeaning, setPairedMeaning] = useState("");
  const [contextWarning, setContextWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    queryFn: () => apiRequest("GET", "/api/tags").then(r => r.json()),
  });

  const filteredSuggestions = tagInput.length > 0
    ? allTags.filter(t => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(t.name))
    : [];

  const mutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const dateAdded = now.toISOString().split("T")[0];
      const res = await apiRequest("POST", "/api/words", {
        word,
        originLanguage,
        meaning: meaning || null,
        context: context || null,
        ratingEssence,
        ratingBeauty,
        ratingSubtlety,
        tags: JSON.stringify(selectedTags),
        pairedWord: pairedWord || null,
        pairedMeaning: pairedMeaning || null,
        dateAdded,
        createdAt: now.toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/words"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onComplete();
      }, 2800);
    },
  });

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    setTagInput("");
  };

  const handleSubmit = () => {
    if (!word.trim()) return;
    // Context warning
    if (!context.trim() && word.trim().split(/\s+/).length === 1) {
      if (!contextWarning) {
        setContextWarning(true);
        return;
      }
    }
    mutation.mutate();
  };

  const languages = [
    { value: "cantonese", label: "粵" },
    { value: "mandarin", label: "中" },
    { value: "english", label: "EN" },
    { value: "other", label: "⋯" },
  ];

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center pt-24"
      >
        {/* Diamond rotation animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
        >
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            {/* Outer ring draws in */}
            <motion.circle
              cx="32" cy="32" r="28"
              stroke="hsl(188 35% 47%)"
              strokeWidth="0.8"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.4 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            />
            {/* Inner ring pulses */}
            <motion.circle
              cx="32" cy="32" r="20"
              stroke="hsl(188 35% 57%)"
              strokeWidth="0.5"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.3 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            />
            {/* Diamond mark */}
            <motion.rect
              x="28" y="28" width="8" height="8"
              fill="hsl(188 35% 47%)"
              rx="1"
              transform="rotate(45 32 32)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            />
          </svg>
        </motion.div>

        {/* "word named" label */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 text-xs text-muted-foreground/60 uppercase tracking-[0.25em]"
        >
          word named
        </motion.p>

        {/* The actual word, revealed with a stagger */}
        <motion.h2
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2 font-serif text-xl text-foreground tracking-wide"
        >
          {word}
        </motion.h2>

        {/* Subtle underline */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.0, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 w-16 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        />

        {/* Saved confirmation */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className="mt-4 text-xs text-primary/60"
        >
          added to collection
        </motion.p>
      </motion.div>
    );
  }

  return (
    <div className="pb-8 pt-2">
      {/* Word input */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Word"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="w-full bg-transparent border-b border-border/40 pb-2 text-lg text-foreground
            placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
          autoFocus
          data-testid="input-word"
        />
      </div>

      {/* Language selector */}
      <div className="flex gap-2 mb-5">
        {languages.map((lang) => (
          <button
            key={lang.value}
            onClick={() => setOriginLanguage(lang.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
              originLanguage === lang.value
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-card/40 text-muted-foreground border border-border/30 hover:border-border/60"
            }`}
            data-testid={`lang-${lang.value}`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Meaning */}
      <div className="mb-5">
        <textarea
          placeholder="What it means..."
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          rows={2}
          className="w-full bg-card/30 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground
            placeholder:text-muted-foreground/40 outline-none focus:border-primary/30 transition-colors resize-none"
          data-testid="input-meaning"
        />
      </div>

      {/* Context */}
      <div className="mb-5">
        <textarea
          placeholder="Context (sentence)..."
          value={context}
          onChange={(e) => { setContext(e.target.value); setContextWarning(false); }}
          rows={2}
          className={`w-full bg-card/30 border rounded-lg px-3 py-2 text-sm text-foreground
            placeholder:text-muted-foreground/40 outline-none focus:border-primary/30 transition-colors resize-none
            ${contextWarning ? "border-amber-500/50" : "border-border/30"}`}
          data-testid="input-context"
        />
        {contextWarning && (
          <p className="text-xs text-amber-500/70 mt-1">
            Single word without context — tap save again to confirm
          </p>
        )}
      </div>

      {/* Paired word (for perfect match) */}
      <div className="mb-5 p-3 rounded-lg border border-border/20 bg-card/20">
        <p className="text-xs text-muted-foreground/60 mb-2 uppercase tracking-wider">Perfect Match Pair</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paired word..."
            value={pairedWord}
            onChange={(e) => setPairedWord(e.target.value)}
            className="flex-1 bg-transparent border-b border-border/30 pb-1 text-sm text-foreground
              placeholder:text-muted-foreground/30 outline-none focus:border-primary/30 transition-colors"
            data-testid="input-paired-word"
          />
        </div>
        {pairedWord && (
          <input
            type="text"
            placeholder="Why they match..."
            value={pairedMeaning}
            onChange={(e) => setPairedMeaning(e.target.value)}
            className="w-full mt-2 bg-transparent border-b border-border/30 pb-1 text-xs text-foreground
              placeholder:text-muted-foreground/30 outline-none focus:border-primary/30 transition-colors"
            data-testid="input-paired-meaning"
          />
        )}
      </div>

      {/* Rating dials */}
      <div className="flex justify-around mb-6">
        <CircularDial
          value={ratingEssence}
          onChange={setRatingEssence}
          label="Essence"
          color="#4fb8a3"
        />
        <CircularDial
          value={ratingBeauty}
          onChange={setRatingBeauty}
          label="Beauty"
          color="#9b7fd4"
        />
        <CircularDial
          value={ratingSubtlety}
          onChange={setRatingSubtlety}
          label="Subtlety"
          color="#d4a34f"
        />
      </div>

      {/* Tags */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary/80 px-2 py-0.5 rounded-full"
            >
              {tag}
              <button
                onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                className="hover:text-primary"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Add tags..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                handleAddTag(tagInput);
              }
            }}
            className="w-full bg-card/30 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground
              placeholder:text-muted-foreground/40 outline-none focus:border-primary/30 transition-colors"
            data-testid="input-tags"
          />
          {/* Autocomplete dropdown */}
          {filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-popover-border rounded-lg overflow-hidden z-10">
              {filteredSuggestions.slice(0, 5).map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag.name)}
                  className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSubmit}
        disabled={!word.trim() || mutation.isPending}
        className="w-full py-3 rounded-xl bg-primary/15 text-primary border border-primary/25
          font-medium text-sm transition-all duration-300
          hover:bg-primary/25 hover:border-primary/40
          disabled:opacity-30 disabled:cursor-not-allowed"
        data-testid="btn-save"
      >
        {mutation.isPending ? (
          <span className="inline-flex items-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="inline-block w-4 h-4 border border-primary/40 border-t-primary rounded-full"
            />
            Saving...
          </span>
        ) : (
          "Save Word"
        )}
      </button>
    </div>
  );
}
