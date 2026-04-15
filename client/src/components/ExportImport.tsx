import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ExportImport({ onImportSuccess }: { onImportSuccess?: () => void }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/json");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `words-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Words exported as JSON");
    } catch (error) {
      toast.error("Failed to export JSON");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/excel");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `words-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Words exported as Excel CSV");
    } catch (error) {
      toast.error("Failed to export Excel");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const response = await fetch("/api/import/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Import failed");
      const result = await response.json();
      toast.success(`Imported ${result.count} words`);
      onImportSuccess?.();
    } catch (error) {
      toast.error("Failed to import JSON file");
      console.error(error);
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    }),
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center pt-2"
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3">
          <path d="M12 8v24M28 8v24" stroke="hsl(188 35% 47%)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
          <path d="M12 8l-5 5M12 8l5 5" stroke="hsl(188 35% 47%)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
          <path d="M28 32l-5-5M28 32l5-5" stroke="hsl(188 35% 47%)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        </svg>
        <h2 className="font-serif text-lg text-foreground/90 tracking-wide">Transfer</h2>
        <p className="text-xs text-muted-foreground/50 mt-1">Export or import your word collection</p>
      </motion.div>

      {/* Export section */}
      <motion.div
        custom={0}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Export</p>

        <button
          onClick={handleExportJSON}
          disabled={isExporting}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border/30
            hover:bg-card/60 hover:border-primary/20 transition-all duration-300
            disabled:opacity-40 disabled:cursor-not-allowed group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0
            group-hover:bg-primary/15 transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v9M5 8l4 4 4-4" stroke="hsl(188 35% 47%)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 13v2h12v-2" stroke="hsl(188 35% 47%)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm text-foreground/90 font-medium">Export as JSON</p>
            <p className="text-xs text-muted-foreground/50 mt-0.5">Technical format with full metadata</p>
          </div>
        </button>

        <button
          onClick={handleExportExcel}
          disabled={isExporting}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border/30
            hover:bg-card/60 hover:border-primary/20 transition-all duration-300
            disabled:opacity-40 disabled:cursor-not-allowed group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0
            group-hover:bg-emerald-500/15 transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="2" width="12" height="14" rx="2" stroke="hsl(160 50% 45%)" strokeWidth="1.3" />
              <path d="M6 6h6M6 9h6M6 12h4" stroke="hsl(160 50% 45%)" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm text-foreground/90 font-medium">Export as Excel</p>
            <p className="text-xs text-muted-foreground/50 mt-0.5">Human-readable CSV spreadsheet</p>
          </div>
        </button>
      </motion.div>

      {/* Divider */}
      <motion.div
        custom={1}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-3 px-1"
      >
        <div className="flex-1 h-px bg-border/30" />
        <span className="text-xs text-muted-foreground/30">or</span>
        <div className="flex-1 h-px bg-border/30" />
      </motion.div>

      {/* Import section */}
      <motion.div
        custom={2}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Import</p>

        <label className="w-full flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border/30
          border-dashed hover:bg-card/60 hover:border-primary/20 transition-all duration-300
          cursor-pointer group">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0
            group-hover:bg-amber-500/15 transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 12V3M5 7l4-4 4 4" stroke="hsl(35 80% 55%)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 13v2h12v-2" stroke="hsl(35 80% 55%)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm text-foreground/90 font-medium">
              {isImporting ? "Importing..." : "Import from JSON"}
            </p>
            <p className="text-xs text-muted-foreground/50 mt-0.5">Restore from a previously exported file</p>
          </div>
          <input
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            disabled={isImporting}
            className="hidden"
          />
        </label>
      </motion.div>

      {/* Info footer */}
      <motion.div
        custom={3}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="mt-2 p-3 rounded-lg bg-card/20 border border-border/15"
      >
        <p className="text-xs text-muted-foreground/40 leading-relaxed">
          JSON exports include all word data, tags, ratings, and metadata.
          Excel exports are formatted for spreadsheet viewing.
          Import only accepts JSON format to preserve data integrity.
        </p>
      </motion.div>
    </div>
  );
}
