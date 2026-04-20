import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Word } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import WordCard from "@/components/WordCard";
import CalendarView from "@/pages/CalendarView";
import TagCloud from "@/pages/TagCloud";
import AddWord from "@/pages/AddWord";
import WordDetail from "@/pages/WordDetail";
import SourcesView from "@/pages/SourcesView";
import ExportImport from "@/components/ExportImport";
import ViewErrorBoundary from "@/components/ViewErrorBoundary";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useWorkMode } from "@/contexts/WorkModeContext";

type View = "collection" | "calendar" | "tags" | "add" | "sources";

export default function Home() {
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<View>("collection");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);

  // Batch select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const shareLinkRef = useRef<HTMLInputElement>(null);

  const { user, isAuthenticated, logout } = useAuth();
  const { isWorkMode, toggle: toggleWorkMode } = useWorkMode();

  const modeParam = `isWork=${isWorkMode}`;

  const { data: words = [], isLoading } = useQuery<Word[]>({
    queryKey: ["/api/words", modeParam],
    queryFn: () => apiRequest("GET", `/api/words?${modeParam}`).then(r => r.json()),
  });

  const { data: searchResults = [] } = useQuery<Word[]>({
    queryKey: ["/api/words/search", searchQuery, modeParam],
    queryFn: () =>
      searchQuery.length > 0
        ? apiRequest("GET", `/api/words/search/${encodeURIComponent(searchQuery)}?${modeParam}`).then(r => r.json())
        : Promise.resolve([]),
    enabled: searchQuery.length > 0,
  });

  // Seed words for new users (runs once after first authenticated load with 0 words)
  const seedAttempted = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || isLoading || seedAttempted.current) return;
    if (words.length === 0) {
      seedAttempted.current = true;
      fetch("/api/seed", { method: "POST", credentials: "include" })
        .then(r => r.json())
        .then(data => {
          if (data.seeded) {
            queryClient.invalidateQueries({ queryKey: ["/api/words"] });
          }
        })
        .catch(() => {}); // silent fail
    } else {
      seedAttempted.current = true;
    }
  }, [isAuthenticated, isLoading, words.length, queryClient]);

  // Read sessionStorage flag from Landing page
  useEffect(() => {
    const openView = sessionStorage.getItem('openView');
    if (openView === 'add') {
      sessionStorage.removeItem('openView');
      setCurrentView('add');
    }
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = () => setShowUserMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showUserMenu]);

  // Exit select mode when switching views
  useEffect(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, [currentView]);

  const handleRandomPick = async () => {
    try {
      const res = await apiRequest("GET", `/api/random?${modeParam}`);
      const word = await res.json();
      setSelectedWord(word);
    } catch {
      // No words yet
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(displayedWords.map(w => w.id)));
  };

  const deselectAll = () => setSelectedIds(new Set());

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/words/batch-delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      toast.success(`Removed ${data.deleted} ${data.deleted === 1 ? "word" : "words"}`);
      queryClient.invalidateQueries({ queryKey: ["/api/words"] });
      setSelectMode(false);
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
    } catch {
      toast.error("Failed to delete words");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateShare = async () => {
    setIsSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordIds: Array.from(selectedIds),
          title: shareTitle.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create share link");
      const deck = await res.json();
      const link = `${window.location.origin}/#/share/${deck.token}`;
      setShareLink(link);
    } catch {
      toast.error("Could not create share link");
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).then(() => {
      toast.success("Link copied to clipboard");
    }).catch(() => {
      shareLinkRef.current?.select();
      document.execCommand("copy");
      toast.success("Link copied");
    });
  };

  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const baseWords = isSearchOpen && searchQuery.length > 0 ? searchResults : words;
  const displayedWords = baseWords.filter(w => {
    if (activeLanguage && w.originLanguage !== activeLanguage) return false;
    if (activeTag) {
      try { if (!JSON.parse(w.tags || '[]').includes(activeTag)) return false; }
      catch { return false; }
    }
    return true;
  });

  const clearFilters = () => { setActiveLanguage(null); setActiveTag(null); };

  const LANG_LABELS: Record<string, string> = { cantonese: '粵', mandarin: '中', english: 'EN', japanese: '日', korean: '韓', french: 'FR', german: 'DE', spanish: 'ES', other: '…' };
  const availableLanguages = Array.from(new Set((words as any[]).map((w: any) => w.originLanguage).filter(Boolean)));

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-2 sm:pb-3 border-b border-border/30 bg-background/80 backdrop-blur-sm">
          <button
            onClick={() => setCurrentView("collection")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            aria-label="Back to word collection"
          >
            <svg width="22" height="22" viewBox="0 0 64 64" fill="none" aria-label="Name of the Words" className="shrink-0">
              <path d="M12 48 C12 24, 20 16, 32 12 C44 16, 52 24, 52 48" stroke={isWorkMode ? "hsl(220 35% 55%)" : "hsl(188 35% 47%)"} strokeWidth="1.5" fill="none" opacity="0.6" />
              <path d="M16 46 C16 28, 22 20, 32 16 C42 20, 48 28, 48 46" stroke={isWorkMode ? "hsl(220 35% 65%)" : "hsl(188 35% 57%)"} strokeWidth="1.2" fill="none" opacity="0.4" />
              <rect x="28" y="28" width="8" height="8" fill={isWorkMode ? "hsl(220 35% 55%)" : "hsl(188 35% 47%)"} opacity="0.7" rx="1" transform="rotate(45 32 32)" />
            </svg>
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-sm text-foreground/90 tracking-wide">Name of the Words</span>
                {isWorkMode && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-blue-500/15 text-blue-400/80 border border-blue-500/20 tracking-wider uppercase font-medium leading-none">
                    Work
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground/60 tracking-[0.18em] uppercase mt-0.5">言之名</span>
            </div>
          </button>

        <div className="flex items-center gap-2">
          {/* Select mode toggle (collection only) */}
          {currentView === "collection" && words.length > 0 && (
            <button
              onClick={() => {
                setSelectMode(!selectMode);
                setSelectedIds(new Set());
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                selectMode ? "text-primary bg-primary/15" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="toggle-select"
              aria-label="Select words"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M10 11.5l1.5 1.5L14 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Search toggle */}
          {!selectMode && (
            <button
              onClick={() => { setIsSearchOpen(!isSearchOpen); setSearchQuery(""); }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              data-testid="toggle-search"
              aria-label="Search"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {/* Random pick */}
          {!selectMode && (
            <button
              onClick={handleRandomPick}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              data-testid="random-pick"
              aria-label="Random word"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
                <circle cx="8" cy="8" r="1" fill="currentColor" />
                <circle cx="10.5" cy="10.5" r="1" fill="currentColor" />
              </svg>
            </button>
          )}

          {/* Auth button */}
          {!selectMode && (
            isAuthenticated ? (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/20 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
                  data-testid="user-avatar"
                  aria-label="User menu"
                >
                  {userInitials}
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-10 w-52 bg-card border border-border/50 rounded-xl shadow-lg overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-border/30">
                        <p className="text-sm font-medium text-foreground truncate">{user?.name || "Anonymous"}</p>
                        {user?.email && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                        )}
                      </div>
                      {/* Work Mode toggle */}
                      <button
                        onClick={async () => { setShowUserMenu(false); await toggleWorkMode(); }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-card/80 transition-colors flex items-center justify-between border-b border-border/20"
                        data-testid="menu-work-mode"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                            <path d="M5 9h6M5 11h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                          </svg>
                          Work Mode
                        </div>
                        <div className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 ${
                          isWorkMode ? "bg-blue-500/70" : "bg-border/50"
                        }`} style={{ height: "18px", width: "32px" }}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            isWorkMode ? "translate-x-3.5" : "translate-x-0"
                          }`} style={{ width: "14px", height: "14px" }} />
                        </div>
                      </button>
                      <button
                        onClick={() => { setShowUserMenu(false); setShowTransferSheet(true); }}
                        className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors flex items-center gap-2 border-b border-border/20"
                        data-testid="menu-transfer"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M6 4v8M14 4v8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          <path d="M6 4l-3 3M6 4l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M14 12l-3-3M14 12l3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Import / Export
                      </button>
                      <button
                        onClick={async () => { setShowUserMenu(false); await logout(); }}
                        className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors flex items-center gap-2"
                        data-testid="logout-button"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          <path d="M11 11l3-3-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M14 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <a
                href={getLoginUrl()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/40 text-primary text-xs hover:bg-primary/10 transition-colors"
                data-testid="login-button"
                aria-label="Sign in"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M10 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M7 11l3-3-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 8H2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                Sign in
              </a>
            )
          )}
        </div>
      </header>

      {/* Batch select toolbar */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-border/30 bg-card/40 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectedIds.size === displayedWords.length ? deselectAll : selectAll}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                  data-testid="select-all"
                >
                  {selectedIds.size === displayedWords.length ? "Deselect all" : "Select all"}
                </button>
                <span className="text-xs text-muted-foreground/50">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Tap cards to select"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={() => { setShareTitle(""); setShareLink(null); setShowShareSheet(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs hover:bg-primary/25 transition-colors"
                      data-testid="share-selected"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <circle cx="13" cy="3" r="2" stroke="currentColor" strokeWidth="1.2" />
                        <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
                        <circle cx="13" cy="13" r="2" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M5 7l6-3M5 9l6 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      Share
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-xs hover:bg-destructive/20 transition-colors"
                      data-testid="delete-selected"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M3 4h10M6 4V3h4v1M5 4v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Remove
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter chip bar */}
      {(activeLanguage || activeTag) && !selectMode && (
        <div className="flex items-center gap-2 px-5 py-2 border-b border-border/20">
          <span className="text-xs text-muted-foreground">Viewing:</span>
          {activeLanguage && (
            <button
              onClick={() => setActiveLanguage(null)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs hover:bg-primary/25 transition-colors"
            >
              {activeLanguage === 'cantonese' ? '粵' : activeLanguage === 'mandarin' ? '中' : activeLanguage === 'english' ? 'EN' : activeLanguage}
              <span className="opacity-60 ml-0.5">×</span>
            </button>
          )}
          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs hover:bg-primary/25 transition-colors"
            >
              {activeTag}
              <span className="opacity-60 ml-0.5">×</span>
            </button>
          )}
          {activeLanguage && activeTag && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground/60 hover:text-muted-foreground ml-1">clear all</button>
          )}
        </div>
      )}

      {/* Search bar */}
      <AnimatePresence>
        {isSearchOpen && !selectMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden px-5"
          >
            <input
              type="search"
              placeholder="Search words, meanings, context..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card/60 border border-border/50 rounded-lg px-3 py-2 text-sm
                text-foreground placeholder:text-muted-foreground/50 outline-none
                focus:border-primary/30 transition-colors mb-3"
              autoFocus
              data-testid="search-input"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-5 pb-24">
        <AnimatePresence mode="wait">
          {currentView === "collection" && (
            <motion.div
              key="collection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Persistent language filter row */}
              {!isLoading && availableLanguages.length > 1 && !selectMode && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 mb-1">
                  <button
                    onClick={() => setActiveLanguage(null)}
                    className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${
                      !activeLanguage
                        ? 'bg-primary/20 border-primary/40 text-primary font-medium'
                        : 'border-border/30 text-muted-foreground hover:border-primary/30 hover:text-primary'
                    }`}
                  >
                    All
                  </button>
                  {availableLanguages.map((lang: string) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLanguage(activeLanguage === lang ? null : lang)}
                      className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${
                        activeLanguage === lang
                          ? 'bg-primary/20 border-primary/40 text-primary font-medium'
                          : 'border-border/30 text-muted-foreground hover:border-primary/30 hover:text-primary'
                      }`}
                    >
                      {LANG_LABELS[lang] || lang}
                    </button>
                  ))}
                </div>
              )}

              {isLoading ? (
                <div className="flex flex-col gap-3 mt-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-card/30 animate-pulse" />
                  ))}
                </div>
              ) : displayedWords.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-24 text-center">
                  <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="mb-4 opacity-30">
                    <rect x="28" y="28" width="8" height="8" fill="hsl(188 35% 47%)" rx="1" transform="rotate(45 32 32)" />
                    <path d="M12 48 C12 24, 20 16, 32 12 C44 16, 52 24, 52 48" stroke="hsl(188 35% 47%)" strokeWidth="1.5" fill="none" />
                  </svg>
                  <p className="text-muted-foreground text-sm mb-1">
                    {isSearchOpen ? "No words found" : "Your word bank is empty"}
                  </p>
                  <p className="text-muted-foreground/50 text-xs">
                    {isSearchOpen ? "Try a different search" : "Tap + to save your first word"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mt-2">
                  <AnimatePresence mode="popLayout">
                    {displayedWords.map((word, i) => (
                      <div
                        key={word.id}
                        className={`relative transition-all duration-200 ${selectMode ? "pl-9" : ""}`}
                      >
                        {/* Checkbox */}
                        {selectMode && (
                          <button
                            onClick={() => toggleSelect(word.id)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center z-10"
                            aria-label={selectedIds.has(word.id) ? "Deselect" : "Select"}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                              selectedIds.has(word.id)
                                ? "bg-primary border-primary"
                                : "border-border/50 bg-card/30"
                            }`}>
                              {selectedIds.has(word.id) && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )}
                        <WordCard
                          word={word}
                          onClick={() => selectMode ? toggleSelect(word.id) : setSelectedWord(word)}
                          animateEntry={!selectMode}
                          index={i}
                          onLanguageClick={selectMode ? undefined : (lang) => setActiveLanguage(lang)}
                          onTagClick={selectMode ? undefined : (tag) => setActiveTag(tag)}
                        />
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {currentView === "calendar" && (
            <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <ViewErrorBoundary viewName="Calendar">
                <CalendarView onSelectWord={setSelectedWord} isWorkMode={isWorkMode} />
              </ViewErrorBoundary>
            </motion.div>
          )}

          {currentView === "tags" && (
            <motion.div key="tags" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <ViewErrorBoundary viewName="Tags">
                <TagCloud onSelectWord={setSelectedWord} isWorkMode={isWorkMode} />
              </ViewErrorBoundary>
            </motion.div>
          )}

          {currentView === "add" && (
            <motion.div key="add" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
              <AddWord onComplete={() => setCurrentView("collection")} isWorkMode={isWorkMode} />
            </motion.div>
          )}

          {currentView === "sources" && (
            <motion.div key="sources" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <ViewErrorBoundary viewName="Sources">
                <SourcesView isWorkMode={isWorkMode} onSelectForShare={(ids) => {
                  setSelectedIds(new Set(ids));
                  setCurrentView("collection");
                  setSelectMode(true);
                  setShareTitle("");
                  setShareLink(null);
                  setShowShareSheet(true);
                }} />
              </ViewErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Word detail overlay */}
      <AnimatePresence>
        {selectedWord && !selectMode && (
          <WordDetail word={selectedWord} onClose={() => setSelectedWord(null)} />
        )}
      </AnimatePresence>

      {/* Delete confirm sheet */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
            <motion.div
              className="relative w-full max-w-md bg-card border-t border-border/30 rounded-t-2xl pb-10 px-5 pt-5"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center mb-4">
                <div className="w-8 h-1 rounded-full bg-border/50" />
              </div>
              <h3 className="font-serif text-base text-foreground mb-1">Remove {selectedIds.size} {selectedIds.size === 1 ? "word" : "words"}?</h3>
              <p className="text-xs text-muted-foreground/60 mb-6">This cannot be undone. The words will be permanently deleted from your collection.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border/40 text-sm text-muted-foreground hover:bg-card/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-destructive/80 hover:bg-destructive text-white text-sm transition-colors disabled:opacity-50"
                  data-testid="confirm-batch-delete"
                >
                  {isDeleting ? "Removing…" : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share sheet */}
      <AnimatePresence>
        {showShareSheet && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowShareSheet(false); setShareLink(null); }} />
            <motion.div
              className="relative w-full max-w-md bg-card border-t border-border/30 rounded-t-2xl pb-10 px-5 pt-5"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center mb-4">
                <div className="w-8 h-1 rounded-full bg-border/50" />
              </div>

              {!shareLink ? (
                <>
                  <h3 className="font-serif text-base text-foreground mb-1">Share {selectedIds.size} {selectedIds.size === 1 ? "word" : "words"}</h3>
                  <p className="text-xs text-muted-foreground/60 mb-4">Anyone with the link can view this deck — no sign-in required.</p>
                  <label className="block text-xs text-muted-foreground/60 mb-1.5 uppercase tracking-wider">Deck title (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Words from Borges"
                    value={shareTitle}
                    onChange={e => setShareTitle(e.target.value)}
                    className="w-full bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 transition-colors mb-5"
                    data-testid="share-title-input"
                  />
                  <button
                    onClick={handleCreateShare}
                    disabled={isSharing}
                    className="w-full py-3 rounded-xl bg-primary/80 hover:bg-primary text-primary-foreground text-sm font-medium transition-colors disabled:opacity-50"
                    data-testid="create-share-link"
                  >
                    {isSharing ? "Generating link…" : "Generate share link"}
                  </button>
                </>
              ) : (
                <>
                  <h3 className="font-serif text-base text-foreground mb-1">Link ready</h3>
                  <p className="text-xs text-muted-foreground/60 mb-4">Share this link — anyone can view the deck without signing in.</p>
                  <div className="flex gap-2 mb-5">
                    <input
                      ref={shareLinkRef}
                      readOnly
                      value={shareLink}
                      className="flex-1 bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-xs text-primary/80 outline-none select-all"
                      data-testid="share-link-value"
                      onFocus={e => e.target.select()}
                    />
                    <button
                      onClick={copyShareLink}
                      className="px-3 py-2 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs hover:bg-primary/25 transition-colors shrink-0"
                      data-testid="copy-share-link"
                    >
                      Copy
                    </button>
                  </div>
                  <button
                    onClick={() => { setShowShareSheet(false); setShareLink(null); setSelectMode(false); setSelectedIds(new Set()); }}
                    className="w-full py-2.5 rounded-xl border border-border/40 text-sm text-muted-foreground hover:bg-card/80 transition-colors"
                  >
                    Done
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer sheet overlay */}
      <AnimatePresence>
        {showTransferSheet && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTransferSheet(false)} />
            <motion.div
              className="relative w-full max-w-md bg-card border-t border-border/30 rounded-t-2xl max-h-[85vh] overflow-y-auto pb-10"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-8 h-1 rounded-full bg-border/50" />
              </div>
              <div className="px-5 pt-2">
                <ExportImport onImportSuccess={() => { setShowTransferSheet(false); window.location.reload(); }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation */}
      <nav className="bg-background/90 backdrop-blur-md border-t border-border/30 shrink-0">
        <div className="flex items-center justify-around py-2 sm:py-3 max-w-full sm:max-w-md mx-auto px-2 sm:px-0">
          {/* Active nav color: teal in aesthetic mode, blue in work mode */}
          {(() => {
            const activeColor = isWorkMode ? "text-blue-400" : "text-primary";
            const addActive = isWorkMode
              ? "bg-blue-500/80 border-blue-500 text-white"
              : "bg-primary border-primary text-primary-foreground";
            const addInactive = isWorkMode
              ? "bg-card border-border/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400/40"
              : "bg-card border-border/50 text-primary hover:bg-primary/10 hover:border-primary/40";
            return (
              <>
          <button
            onClick={() => setCurrentView("collection")}
            className={`flex flex-col items-center gap-1 transition-colors ${currentView === "collection" ? activeColor : "text-muted-foreground"}`}
            data-testid="nav-collection" aria-label="Collection"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>

          <button
            onClick={() => setCurrentView("calendar")}
            className={`flex flex-col items-center gap-1 transition-colors ${currentView === "calendar" ? activeColor : "text-muted-foreground"}`}
            data-testid="nav-calendar" aria-label="Calendar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M3 8h14" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7 2v4M13 2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>

          <button
            onClick={() => setCurrentView("add")}
            className={`w-11 h-11 -mt-3 rounded-full flex items-center justify-center border transition-all duration-300 ${
              currentView === "add" ? addActive : addInactive
            }`}
            data-testid="nav-add" aria-label="Add word"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <button
            onClick={() => setCurrentView("tags")}
            className={`flex flex-col items-center gap-1 transition-colors ${currentView === "tags" ? activeColor : "text-muted-foreground"}`}
            data-testid="nav-tags" aria-label="Tags"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10l7-7h7v7l-7 7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" />
            </svg>
          </button>

          <button
            onClick={() => setCurrentView("sources")}
            className={`flex flex-col items-center gap-1 transition-colors ${currentView === "sources" ? activeColor : "text-muted-foreground"}`}
            data-testid="nav-sources" aria-label="Sources"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 3h5.5c1 0 1.5.5 1.5 1.5v11c0-1-0.5-1.5-1.5-1.5H4V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M16 3h-5.5c-1 0-1.5.5-1.5 1.5v11c0-1 0.5-1.5 1.5-1.5H16V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </button>
              </>
            );
          })()}
        </div>
      </nav>
      {/* Floating Add button (fixed at bottom) */}
      {currentView !== "add" && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => setCurrentView("add")}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center border border-primary/30 transition-all duration-300 hover:border-primary/60 hover:bg-primary/5 z-40"
          data-testid="floating-add-button"
          aria-label="Add word"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-primary/70 hover:text-primary transition-colors duration-300">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.button>
      )}
    </div>
  );
}
