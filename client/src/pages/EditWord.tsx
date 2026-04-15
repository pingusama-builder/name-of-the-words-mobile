import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import CircularDial from "@/components/CircularDial";
import type { Word, Tag } from "@shared/schema";

interface EditWordProps {
  word: Word;
  onClose: () => void;
  onSaved?: (updated: Word) => void;
}

const LANGUAGES = [
  { value: "cantonese", label: "粵" },
  { value: "mandarin", label: "中" },
  { value: "english", label: "EN" },
  { value: "other", label: "⋯" },
];

export default function EditWord({ word, onClose, onSaved }: EditWordProps) {
  const queryClient = useQueryClient();

  // Parse existing tags from JSON string
  const initialTags: string[] = (() => {
    try { return JSON.parse(word.tags || "[]"); }
    catch { return []; }
  })();

  // Form state — pre-filled from existing word
  const [wordText, setWordText] = useState(word.word);
  const [originLanguage, setOriginLanguage] = useState(word.originLanguage);
  const [meaning, setMeaning] = useState(word.meaning || "");
  const [context, setContext] = useState(word.context || "");
  const [ratingEssence, setRatingEssence] = useState(word.ratingEssence || 0);
  const [ratingBeauty, setRatingBeauty] = useState(word.ratingBeauty || 0);
  const [ratingSubtlety, setRatingSubtlety] = useState(word.ratingSubtlety || 0);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pairedWord, setPairedWord] = useState(word.pairedWord || "");
  const [pairedMeaning, setPairedMeaning] = useState(word.pairedMeaning || "");
  const [showSuccess, setShowSuccess] = useState(false);

  // Source / location fields — pre-filled from existing word
  const [source, setSource] = useState(word.source || "");
  const [location, setLocation] = useState(word.location || "");
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const sourceInputRef = useRef<HTMLInputElement>(null);

  const tagInputRef = useRef<HTMLInputElement>(null);

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    queryFn: () => apiRequest("GET", "/api/tags").then(r => r.json()),
  });

  // Fetch existing words to derive source autocomplete list
  const { data: allWords = [] } = useQuery<Word[]>({
    queryKey: ["/api/words"],
    queryFn: () => apiRequest("GET", "/api/words").then(r => r.json()),
  });

  const allSources = Array.from(
    new Set(allWords.map((w) => w.source).filter((s): s is string => !!s && s.trim().length > 0))
  ).sort();

  const filteredSourceSuggestions = source.trim().length > 0
    ? allSources.filter(s => s.toLowerCase().includes(source.toLowerCase()))
    : allSources.slice(0, 6);

  const filteredSuggestions = tagInput.trim().length > 0
    ? allTags.filter(
        t => t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
             !selectedTags.includes(t.name)
      )
    : allTags.filter(t => !selectedTags.includes(t.name)).slice(0, 6);

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags(prev => [...prev, trimmed]);
    }
    setTagInput("");
    setShowSuggestions(false);
    tagInputRef.current?.focus();
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (finalTags: string[]) => {
      // Auto-extract first integer from location for sorting
      const locationOrderMatch = location.match(/\d+/);
      const locationOrder = locationOrderMatch ? parseInt(locationOrderMatch[0], 10) : null;
      const res = await apiRequest("PUT", `/api/words/${word.id}`, {
        word: wordText,
        originLanguage,
        meaning: meaning || null,
        context: context || null,
        ratingEssence,
        ratingBeauty,
        ratingSubtlety,
        tags: finalTags,
        pairedWord: pairedWord || null,
        pairedMeaning: pairedMeaning || null,
        source: source.trim() || null,
        location: location.trim() || null,
        locationOrder,
      });
      return res.json() as Promise<Word>;
    },
    onSuccess: (updated) => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/words"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      setShowSuccess(true);
      setTimeout(() => {
        onSaved?.(updated);
        onClose();
      }, 1200);
    },
    onError: (err: any) => {
      setSaveError(err?.message || "Failed to save changes. Please try again.");
    },
  });

  const handleSave = () => {
    if (!wordText.trim()) return;
    const finalTags = [...selectedTags];
    const pending = tagInput.trim();
    if (pending && !finalTags.includes(pending)) finalTags.push(pending);
    mutation.mutate(finalTags);
  };

  return (
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
          max-h-[90vh] overflow-y-auto pb-10"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-border/50" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-border/20">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Edit Word</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground/50 hover:text-foreground transition-colors p-1"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-5">
          {showSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 14, stiffness: 200 }}
              >
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <motion.circle
                    cx="24" cy="24" r="20"
                    stroke="hsl(188 35% 47%)"
                    strokeWidth="1"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <motion.path
                    d="M15 24l6 6 12-12"
                    stroke="hsl(188 35% 57%)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </svg>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-4 text-xs text-muted-foreground/60 uppercase tracking-[0.2em]"
              >
                saved
              </motion.p>
            </motion.div>
          ) : (
            <>
              {/* Word input */}
              <div className="mb-5">
                <input
                  type="text"
                  placeholder="Word"
                  value={wordText}
                  onChange={(e) => setWordText(e.target.value)}
                  className="w-full bg-transparent border-b border-border/40 pb-2 text-lg text-foreground
                    placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors"
                  data-testid="edit-input-word"
                />
              </div>

              {/* Language selector */}
              <div className="flex gap-2 mb-5">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => setOriginLanguage(lang.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                      originLanguage === lang.value
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-card/40 text-muted-foreground border border-border/30 hover:border-border/60"
                    }`}
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
                  data-testid="edit-input-meaning"
                />
              </div>

              {/* Context */}
              <div className="mb-5">
                <textarea
                  placeholder="Context (sentence)..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={2}
                  className="w-full bg-card/30 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground
                    placeholder:text-muted-foreground/40 outline-none focus:border-primary/30 transition-colors resize-none"
                  data-testid="edit-input-context"
                />
              </div>

              {/* Source & Location */}
              <div className="mb-5 p-3 rounded-lg border border-border/20 bg-card/20">
                <p className="text-xs text-muted-foreground/60 mb-2 uppercase tracking-wider">Source</p>
                <div className="relative mb-2">
                  <input
                    ref={sourceInputRef}
                    type="text"
                    placeholder="Book, article, show..."
                    value={source}
                    onChange={(e) => { setSource(e.target.value); setShowSourceSuggestions(true); }}
                    onFocus={() => setShowSourceSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSourceSuggestions(false), 150)}
                    className="w-full bg-transparent border-b border-border/30 pb-1 text-sm text-foreground
                      placeholder:text-muted-foreground/30 outline-none focus:border-primary/30 transition-colors"
                    data-testid="edit-input-source"
                  />
                  <AnimatePresence>
                    {showSourceSuggestions && filteredSourceSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg overflow-hidden z-20 shadow-lg"
                      >
                        {filteredSourceSuggestions.slice(0, 6).map((s) => (
                          <button
                            key={s}
                            onMouseDown={(e) => { e.preventDefault(); setSource(s); setShowSourceSuggestions(false); }}
                            className="w-full text-left px-3 py-2 text-sm text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 opacity-40">
                              <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" />
                              <path d="M3 4h6M3 6h6M3 8h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                            </svg>
                            {s}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <input
                  type="text"
                  placeholder="Location (p. 142, ch. 3, 第三章...)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent border-b border-border/30 pb-1 text-sm text-foreground
                    placeholder:text-muted-foreground/30 outline-none focus:border-primary/30 transition-colors"
                  data-testid="edit-input-location"
                />
              </div>

              {/* Paired word */}
              <div className="mb-5 p-3 rounded-lg border border-border/20 bg-card/20">
                <p className="text-xs text-muted-foreground/60 mb-2 uppercase tracking-wider">Perfect Match Pair</p>
                <input
                  type="text"
                  placeholder="Paired word..."
                  value={pairedWord}
                  onChange={(e) => setPairedWord(e.target.value)}
                  className="w-full bg-transparent border-b border-border/30 pb-1 text-sm text-foreground
                    placeholder:text-muted-foreground/30 outline-none focus:border-primary/30 transition-colors"
                  data-testid="edit-input-paired-word"
                />
                {pairedWord && (
                  <input
                    type="text"
                    placeholder="Why they match..."
                    value={pairedMeaning}
                    onChange={(e) => setPairedMeaning(e.target.value)}
                    className="w-full mt-2 bg-transparent border-b border-border/30 pb-1 text-xs text-foreground
                      placeholder:text-muted-foreground/30 outline-none focus:border-primary/30 transition-colors"
                    data-testid="edit-input-paired-meaning"
                  />
                )}
              </div>

              {/* Rating dials */}
              <div className="flex justify-around mb-6">
                <CircularDial value={ratingEssence} onChange={setRatingEssence} label="Essence" color="#4fb8a3" />
                <CircularDial value={ratingBeauty} onChange={setRatingBeauty} label="Beauty" color="#9b7fd4" />
                <CircularDial value={ratingSubtlety} onChange={setRatingSubtlety} label="Subtlety" color="#d4a34f" />
              </div>

              {/* Tags */}
              <div className="mb-6">
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary/80 px-2 py-0.5 rounded-full border border-primary/20"
                      >
                        {tag}
                        <button
                          onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                          className="hover:text-primary leading-none"
                          aria-label={`Remove tag ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <input
                    ref={tagInputRef}
                    type="text"
                    placeholder={selectedTags.length === 0 ? "Add tags... (press Enter or comma)" : "Add more tags..."}
                    value={tagInput}
                    onChange={(e) => { setTagInput(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        if (tagInput.trim()) handleAddTag(tagInput);
                      } else if (e.key === "Backspace" && !tagInput && selectedTags.length > 0) {
                        setSelectedTags(prev => prev.slice(0, -1));
                      }
                    }}
                    className="w-full bg-card/30 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground
                      placeholder:text-muted-foreground/40 outline-none focus:border-primary/30 transition-colors"
                    data-testid="edit-input-tags"
                  />
                  <AnimatePresence>
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg overflow-hidden z-20 shadow-lg"
                      >
                        {filteredSuggestions.slice(0, 6).map((tag) => (
                          <button
                            key={tag.id}
                            onMouseDown={(e) => { e.preventDefault(); handleAddTag(tag.name); }}
                            className="w-full text-left px-3 py-2 text-sm text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                            {tag.name}
                          </button>
                        ))}
                        {tagInput.trim() && !allTags.some(t => t.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
                          <button
                            onMouseDown={(e) => { e.preventDefault(); handleAddTag(tagInput); }}
                            className="w-full text-left px-3 py-2 text-sm text-primary/70 hover:bg-primary/10 transition-colors flex items-center gap-2 border-t border-border/20"
                          >
                            <span className="text-primary/50">+</span>
                            Create &ldquo;{tagInput.trim()}&rdquo;
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <p className="text-xs text-muted-foreground/40 mt-1.5">
                  Press Enter or comma to add · Backspace to remove last
                </p>
              </div>

              {/* Error message */}
              {saveError && (
                <p className="text-xs text-destructive/80 mb-3 px-1">{saveError}</p>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={!wordText.trim() || mutation.isPending}
                className="w-full py-3 rounded-xl bg-primary/15 text-primary border border-primary/25
                  font-medium text-sm transition-all duration-300
                  hover:bg-primary/25 hover:border-primary/40
                  disabled:opacity-30 disabled:cursor-not-allowed"
                data-testid="edit-btn-save"
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
                ) : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
