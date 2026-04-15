import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { Word } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import WordCard from "@/components/WordCard";
import CalendarView from "@/pages/CalendarView";
import TagCloud from "@/pages/TagCloud";
import AddWord from "@/pages/AddWord";
import WordDetail from "@/pages/WordDetail";
import ExportImport from "@/components/ExportImport";

type View = "collection" | "calendar" | "tags" | "add";

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("collection");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  // Refetch words when import succeeds
  const refetchWords = () => {
    window.location.reload();
  };

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Mobile First: sticky, responsive padding */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-2 sm:pb-3 border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 64 64" fill="none" aria-label="Name of the Words">
            <rect x="28" y="28" width="8" height="8" fill="hsl(188 35% 47%)" opacity="0.7" rx="1" transform="rotate(45 32 32)" />
            <path d="M12 48 C12 24, 20 16, 32 12 C44 16, 52 24, 52 48" stroke="hsl(188 35% 47%)" strokeWidth="1.5" fill="none" opacity="0.5" />
          </svg>
          <span className="font-serif text-sm text-foreground/80 tracking-wide">言之名</span>
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

      {/* Main content area - Mobile First: responsive padding */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-5 pb-28 sm:pb-24">
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
                  <ExportImport onImportSuccess={() => window.location.reload()} />
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
              <CalendarView onSelectWord={setSelectedWord} />
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
              <TagCloud onSelectWord={setSelectedWord} />
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
        </AnimatePresence>
      </main>

      {/* Word detail overlay */}
      <AnimatePresence>
        {selectedWord && (
          <WordDetail word={selectedWord} onClose={() => setSelectedWord(null)} />
        )}
      </AnimatePresence>

      {/* Bottom navigation — icon-based, Mobile First */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border/30">
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
            className="flex flex-col items-center gap-1 text-muted-foreground"
            data-testid="nav-menu"
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="5" r="1.2" fill="currentColor" />
              <circle cx="10" cy="10" r="1.2" fill="currentColor" />
              <circle cx="10" cy="15" r="1.2" fill="currentColor" />
            </svg>
          </button>
        </div>
      </nav>
    </div>
  );
}
