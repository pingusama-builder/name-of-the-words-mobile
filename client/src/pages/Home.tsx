import { useState, useRef, useEffect } from "react";
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

  // Filter state
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const { user, isAuthenticated, logout } = useAuth();
  const { isWorkMode, toggle: toggleWorkMode } = useWorkMode();

  const modeParam = `isWork=${isWorkMode}`;

  const { data: words = [], isLoading } = useQuery<Word[]>({
    queryKey: ["/api/words", modeParam],
    queryFn: () => apiRequest("GET", `/api/words?${modeParam}`).then(r => r.json()),
  });

  // Seed words on first login
  useEffect(() => {
    if (user && isAuthenticated && words.length === 0) {
      apiRequest("POST", "/api/seed").catch(() => {});
    }
  }, [user, isAuthenticated, words.length]);

  const availableLanguages = Array.from(new Set(words.map(w => w.originLanguage))).sort();

  const displayedWords = words.filter(w => {
    if (activeLanguage && w.originLanguage !== activeLanguage) return false;
    if (activeTag && w.tags && !w.tags.includes(activeTag)) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return w.word.toLowerCase().includes(query) || (w.meaning?.toLowerCase().includes(query) ?? false);
    }
    return true;
  });

  const filteredWords = displayedWords.filter(w => {
    if (activeLanguage && w.originLanguage !== activeLanguage) return false;
    if (activeTag && w.tags && !w.tags.includes(activeTag)) return false;
    return true;
  });

  const handleLanguageClick = (lang: string) => {
    setActiveLanguage(activeLanguage === lang ? null : lang);
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(activeTag === tag ? null : tag);
  };

  const handleSelectWord = (word: Word) => {
    if (selectMode) {
      const newIds = new Set(selectedIds);
      if (newIds.has(word.id)) {
        newIds.delete(word.id);
      } else {
        newIds.add(word.id);
      }
      setSelectedIds(newIds);
    } else {
      setSelectedWord(word);
    }
  };

  const handleShare = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one word to share");
      return;
    }
    setIsSharing(true);
    try {
      const res = await apiRequest("POST", "/api/share", {
        wordIds: Array.from(selectedIds),
        title: shareTitle || "Shared Deck",
      });
      const data = await res.json();
      if (data.token) {
        const url = `${window.location.origin}/#/share/${data.token}`;
        setShareLink(url);
      }
    } catch (err) {
      toast.error("Failed to create share link");
    } finally {
      setIsSharing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          apiRequest("DELETE", `/api/words/${id}`)
        )
      );
      queryClient.invalidateQueries({ queryKey: ["/api/words"] });
      setSelectedIds(new Set());
      setSelectMode(false);
      toast.success(`Deleted ${selectedIds.size} word(s)`);
    } catch (err) {
      toast.error("Failed to delete words");
    } finally {
      setIsDeleting(false);
    }
  };

  const activeColor = isWorkMode ? "text-blue-500" : "text-teal-500";
  const addActive = isWorkMode ? "border-blue-500/50 bg-blue-500/10" : "border-teal-500/50 bg-teal-500/10";
  const addInactive = "border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50";

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <button
            onClick={() => setCurrentView("collection")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-teal-500">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="flex flex-col">
              <div className="font-serif text-sm md:text-base font-normal">Name of the Words</div>
              <div className="text-xs md:text-sm text-muted-foreground tracking-widest">言之名</div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {isWorkMode && <span className="text-xs px-2 py-1 rounded border border-blue-500/50 text-blue-500">WORK</span>}
            {isAuthenticated && (
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs font-medium"
              >
                {user?.name?.[0]?.toUpperCase() || "U"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4 py-4">
          <ViewErrorBoundary>
            {currentView === "collection" && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search words..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 rounded border border-border bg-background text-foreground placeholder:text-muted-foreground/60"
                  />
                  <button
                    onClick={() => setSelectMode(!selectMode)}
                    className="px-3 py-2 rounded border border-border hover:bg-muted/50 transition-colors"
                  >
                    {selectMode ? "Done" : "Select"}
                  </button>
                </div>

                {/* Batch Toolbar */}
                {selectMode && (
                  <div className="flex gap-2 p-3 rounded border border-border bg-muted/30">
                    <button
                      onClick={() => setSelectedIds(new Set(filteredWords.map(w => w.id)))}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => setShowShareSheet(true)}
                      className="text-sm px-2 py-1 rounded bg-teal-500/20 text-teal-500 hover:bg-teal-500/30"
                    >
                      Share ({selectedIds.size})
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-sm px-2 py-1 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                )}

                {/* Language Filter */}
                {availableLanguages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                      onClick={() => setActiveLanguage(null)}
                      className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                        activeLanguage === null
                          ? activeColor
                          : "border border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50"
                      }`}
                    >
                      All
                    </button>
                    {availableLanguages.map(lang => (
                      <button
                        key={lang}
                        onClick={() => handleLanguageClick(lang)}
                        className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                          activeLanguage === lang
                            ? activeColor
                            : "border border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                )}

                {/* Word List */}
                <motion.div className="space-y-3">
                  <AnimatePresence>
                    {filteredWords.map(word => (
                      <motion.div key={word.id} layout>
                        <WordCard
                          word={word}
                          onLanguageClick={handleLanguageClick}
                          onTagClick={handleTagClick}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {filteredWords.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    No words found
                  </div>
                )}
              </div>
            )}

            {currentView === "calendar" && <CalendarView isWorkMode={isWorkMode} onSelectWord={handleSelectWord} />}
            {currentView === "tags" && <TagCloud isWorkMode={isWorkMode} onSelectWord={handleSelectWord} />}
            {currentView === "sources" && <SourcesView isWorkMode={isWorkMode} onSelectForShare={(ids) => { setSelectedIds(new Set(ids)); setShowShareSheet(true); }} />}
            {currentView === "add" && <AddWord isWorkMode={isWorkMode} onComplete={() => setCurrentView("collection")} onCancel={() => setCurrentView("collection")} />}
          </ViewErrorBoundary>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="border-t border-border bg-background">
        <div className="max-w-2xl mx-auto w-full px-4 py-3 flex items-center justify-around">
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
        </div>
      </nav>

      {/* Floating Add Button */}
      <button
        onClick={() => setCurrentView("add")}
        className={`fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all z-40 ${
          currentView === "add" ? addActive : addInactive
        }`}
        data-testid="floating-add" aria-label="Add word"
      >
        <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
