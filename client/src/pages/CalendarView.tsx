import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { Word } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import Diamond from "@/components/Diamond";
import WordCard from "@/components/WordCard";

interface CalendarViewProps {
  onSelectWord: (word: Word) => void;
}

export default function CalendarView({ onSelectWord }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: calendarData = [] } = useQuery<{ date: string; count: number; wordIds: number[]; colors: string[] }[]>({
    queryKey: ["/api/calendar"],
    queryFn: () => apiRequest("GET", "/api/calendar").then(r => r.json()),
  });

  const { data: dateWords = [] } = useQuery<Word[]>({
    queryKey: ["/api/words/date", selectedDate],
    queryFn: () =>
      selectedDate
        ? apiRequest("GET", `/api/words/date/${selectedDate}`).then(r => r.json())
        : Promise.resolve([]),
    enabled: !!selectedDate,
  });

  const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentMonth.year, currentMonth.month, 1).getDay();
  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const monthNameZh = new Date(currentMonth.year, currentMonth.month).toLocaleDateString("zh-TW", {
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const dateCountMap = new Map(calendarData.map(d => [d.date, d.count]));
  const dateColorsMap = new Map(calendarData.map(d => [d.date, d.colors ?? []]));  

  const prevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
    setSelectedDate(null);
  };

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="pt-2">
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          data-testid="calendar-prev"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="font-serif text-base text-foreground">{monthName}</h2>
          <p className="text-xs text-muted-foreground/60">{monthNameZh}</p>
        </div>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          data-testid="calendar-next"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, i) => (
          <div key={i} className="text-center text-xs text-muted-foreground/50 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {/* Empty cells before first day */}
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <div key={`empty-${i}`} className="h-14" />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const wordCount = dateCountMap.get(dateStr) || 0;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
              className={`h-14 flex flex-col items-center justify-start pt-1 rounded-lg transition-all duration-200
                ${isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-card/40"}
                ${isToday ? "ring-1 ring-primary/30" : ""}
              `}
              data-testid={`calendar-day-${day}`}
            >
              <span className={`text-xs mb-1 ${
                isToday ? "text-primary font-medium" : "text-muted-foreground/70"
              }`}>
                {day}
              </span>
              {wordCount > 0 && (
                <Diamond
                  count={Math.min(wordCount, 3)}
                  colors={dateColorsMap.get(dateStr)}
                  size={16}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date words */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="border-t border-border/20 pt-4">
            <p className="text-xs text-muted-foreground/60 mb-3 uppercase tracking-wider">
              {selectedDate}
            </p>
            {dateWords.length === 0 ? (
              <p className="text-sm text-muted-foreground/40 text-center py-4">
                No words on this day
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {dateWords.map((word) => (
                  <WordCard key={word.id} word={word} onClick={() => onSelectWord(word)} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
