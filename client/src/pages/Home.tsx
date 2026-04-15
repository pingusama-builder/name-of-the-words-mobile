import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
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

type View = "collection" | "calendar" | "tags" | "add" | "sources";

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("collection");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();

  const { data: words = [], isLoading } = useQuery<Word[]>({
    queryKey: ["/api/words"],
    queryFn: () => apiRequest("GET", "/api/words").then(r => r.json()),
  });

  const { data: searchResults = [] } = useQuery<Word[]>({
    queryKey: ["/api/words/search", searchQuery],
    queryFn: () =>
      searchQuery.length > 0
        ? apiRequest("GET", `/api/words/search/${encodeURIComponent(searchQuery)}`).then(r => r.json())
        : Promise.resolve([]),
    enabled: searchQuery.length > 0,
  });

  // Read sessionStorage flag from Landing page + button
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

  const handleRandomPick = async () => {
    try {
      const res = await apiRequest("GET", "/api/random");
      const word = await res.json();
      setSelectedWord(word);
    } catch {
      // No words yet
    }
  };

  const displayedWords = isSearchOpen && searchQuery.length > 0 ? searchResults : words;

  // Derive user initials for avatar
  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-2 sm:pb-3 border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 64 64" fill="none" aria-label="Name of the Words" className="shrink-0">
            <path d="M12 48 C12 24, 20 16, 32 12 C44 16, 52 24, 52 48" stroke="hsl(188 35% 47%)" strokeWidth="1.5" fill="none" opacity="0.6" />
            <path d="M16 46 C16 28, 22 20, 32 16 C42 20, 48 28, 48 46" stroke="hsl(188 35% 57%)" strokeWidth="1.2" fill="none" opacity="0.4" />
            <rect x="28" y="28" width="8" height="8" fill="hsl(188 35% 47%)" opacity="0.7" rx="1" transform="rotate(45 32 32)" />
          </svg>
          <div className="flex flex-col leading-none">
            <span className="font-serif text-sm text-foreground/90 tracking-wide">Name of the Words</span>
            <span className="text-[10px] text-muted-foreground/60 tracking-[0.18em] uppercase mt-0.5">言之名</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search toggle */}
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

          {/* Random pick */}
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

          {/* Auth button — login or user avatar */}
          {isAuthenticated ? (
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
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border/30">
                      <p className="text-sm font-medium text-foreground truncate">{user?.name || "Anonymous"}</p>
                      {user?.email && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                      )}
                    </div>

                    {/* Import/Export */}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowTransferSheet(true);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors flex items-center gap-2 border-b border-border/20"
                      data-testid="menu-transfer"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M6 4v12M14 4v12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        <path d="M6 4l-3 3M6 4l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M14 16l-3-3M14 16l3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Import / Export
                    </button>

                    {/* Logout */}
                    <button
                      onClick={async () => {
                        setShowUserMenu(false);
                        await logout();
                      }}
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
          )}
        </div>
      </header>

      {/* Search bar */}
      <AnimatePresence>
        {isSearchOpen && (
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
                      <WordCard
                        key={word.id}
                        word={word}
                        onClick={() => setSelectedWord(word)}
                        animateEntry={true}
                        index={i}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {currentView === "calendar" && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ViewErrorBoundary viewName="Calendar">
                <CalendarView onSelectWord={setSelectedWord} />
              </ViewErrorBoundary>
            </motion.div>
          )}

          {currentView === "tags" && (
            <motion.div
              key="tags"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ViewErrorBoundary viewName="Tags">
                <TagCloud onSelectWord={setSelectedWord} />
              </ViewErrorBoundary>
            </motion.div>
          )}

          {currentView === "add" && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <AddWord onComplete={() => setCurrentView("collection")} />
            </motion.div>
          )}

          {currentView === "sources" && (
            <motion.div
              key="sources"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ViewErrorBoundary viewName="Sources">
                <SourcesView />
              </ViewErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Word detail overlay */}
      <AnimatePresence>
        {selectedWord && (
          <WordDetail word={selectedWord} onClose={() => setSelectedWord(null)} />
        )}
      </AnimatePresence>

      {/* Transfer sheet overlay */}
      <AnimatePresence>
        {showTransferSheet && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowTransferSheet(false)}
            />
            <motion.div
              className="relative w-full max-w-md bg-card border-t border-border/30 rounded-t-2xl
                max-h-[85vh] overflow-y-auto pb-10"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-8 h-1 rounded-full bg-border/50" />
              </div>
              <div className="px-5 pt-2">
                <ExportImport onImportSuccess={() => {
                  setShowTransferSheet(false);
                  window.location.reload();
                }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation */}
      <nav className="bg-background/90 backdrop-blur-md border-t border-border/30 shrink-0">
        <div className="flex items-center justify-around py-2 sm:py-3 max-w-full sm:max-w-md mx-auto px-2 sm:px-0">
          <button
            onClick={() => setCurrentView("collection")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentView === "collection" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="nav-collection"
            aria-label="Collection"
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
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentView === "calendar" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="nav-calendar"
            aria-label="Calendar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M3 8h14" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7 2v4M13 2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>

          <button
            onClick={() => setCurrentView("add")}
            className={`w-11 h-11 -mt-3 rounded-full flex items-center justify-center
              border transition-all duration-300 ${
                currentView === "add"
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-card border-border/50 text-primary hover:bg-primary/10 hover:border-primary/40"
              }`}
            data-testid="nav-add"
            aria-label="Add word"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <button
            onClick={() => setCurrentView("tags")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentView === "tags" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="nav-tags"
            aria-label="Tags"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10l7-7h7v7l-7 7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" />
            </svg>
          </button>

          <button
            onClick={() => setCurrentView("sources")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentView === "sources" ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid="nav-sources"
            aria-label="Sources"
          >
            {/* Book / sources icon */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 3h5.5c1 0 1.5.5 1.5 1.5v11c0-1-0.5-1.5-1.5-1.5H4V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M16 3h-5.5c-1 0-1.5.5-1.5 1.5v11c0-1 0.5-1.5 1.5-1.5H16V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </nav>
    </div>
  );
}
