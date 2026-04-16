import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface WorkModeContextValue {
  isWorkMode: boolean;
  isLoading: boolean;
  toggle: () => Promise<void>;
}

const WorkModeContext = createContext<WorkModeContextValue>({
  isWorkMode: false,
  isLoading: true,
  toggle: async () => {},
});

export function WorkModeProvider({ children }: { children: ReactNode }) {
  const [isWorkMode, setIsWorkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load preference from server on mount
  useEffect(() => {
    apiRequest("GET", "/api/preferences")
      .then(r => r.json())
      .then(d => {
        setIsWorkMode(Boolean(d.workMode));
        setIsLoading(false);
      })
      .catch(() => {
        // Not authenticated or server error — default to aesthetic mode
        setIsLoading(false);
      });
  }, []);

  const toggle = useCallback(async () => {
    const next = !isWorkMode;
    setIsWorkMode(next); // optimistic
    try {
      await apiRequest("POST", "/api/preferences", { workMode: next });
    } catch {
      setIsWorkMode(!next); // rollback on error
    }
  }, [isWorkMode]);

  return (
    <WorkModeContext.Provider value={{ isWorkMode, isLoading, toggle }}>
      {children}
    </WorkModeContext.Provider>
  );
}

export function useWorkMode() {
  return useContext(WorkModeContext);
}
