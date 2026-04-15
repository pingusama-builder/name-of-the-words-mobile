import { useState } from "react";
import { Download, Upload } from "lucide-react";
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
      // Reset input
      event.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-card/50 rounded-lg border border-border/30">
      <div className="text-sm font-medium text-foreground">Export & Import</div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleExportJSON}
          disabled={isExporting}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors disabled:opacity-50"
        >
          <Download size={16} />
          <span className="text-sm">Export JSON</span>
        </button>

        <button
          onClick={handleExportExcel}
          disabled={isExporting}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors disabled:opacity-50"
        >
          <Download size={16} />
          <span className="text-sm">Export Excel</span>
        </button>

        <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-md transition-colors cursor-pointer disabled:opacity-50">
          <Upload size={16} />
          <span className="text-sm">Import JSON</span>
          <input
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            disabled={isImporting}
            className="hidden"
          />
        </label>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>• <strong>JSON</strong>: Technical format with full metadata</p>
        <p>• <strong>Excel</strong>: Human-readable CSV format</p>
      </div>
    </div>
  );
}
