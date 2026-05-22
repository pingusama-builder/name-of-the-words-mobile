import React, { createContext, useContext, useState, useEffect } from 'react';

interface WordListContextType {
  showAllWords: boolean;
  setShowAllWords: (show: boolean) => void;
  wordLimit: number | undefined;
}

const WordListContext = createContext<WordListContextType | undefined>(undefined);

export function WordListProvider({ children }: { children: React.ReactNode }) {
  const [showAllWords, setShowAllWordsState] = useState(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wordListShowAll');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  useEffect(() => {
    // Save to localStorage whenever it changes
    localStorage.setItem('wordListShowAll', JSON.stringify(showAllWords));
  }, [showAllWords]);

  const setShowAllWords = (show: boolean) => {
    setShowAllWordsState(show);
  };

  const wordLimit = showAllWords ? undefined : 10;

  return (
    <WordListContext.Provider value={{ showAllWords, setShowAllWords, wordLimit }}>
      {children}
    </WordListContext.Provider>
  );
}

export function useWordList() {
  const context = useContext(WordListContext);
  if (!context) {
    throw new Error('useWordList must be used within WordListProvider');
  }
  return context;
}
