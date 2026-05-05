/**
 * Instance Form Component
 * Reusable form for creating and editing idea instances with full fields
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface InstanceFormProps {
  onSubmit: (data: {
    context: string;
    location?: string;
    meaning?: string;
    interpretation?: string;
    dateEncountered?: string;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  initialData?: {
    context?: string;
    location?: string;
    meaning?: string;
    interpretation?: string;
    dateEncountered?: string;
  };
}

export default function InstanceForm({
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = "Add",
  initialData = {},
}: InstanceFormProps) {
  const [context, setContext] = useState(initialData.context || "");
  const [location, setLocation] = useState(initialData.location || "");
  const [meaning, setMeaning] = useState(initialData.meaning || "");
  const [interpretation, setInterpretation] = useState(initialData.interpretation || "");
  const [dateEncountered, setDateEncountered] = useState(initialData.dateEncountered || "");

  const handleSubmit = () => {
    if (!context.trim()) {
      alert("Context is required");
      return;
    }

    onSubmit({
      context,
      location: location || undefined,
      meaning: meaning || undefined,
      interpretation: interpretation || undefined,
      dateEncountered: dateEncountered || undefined,
    });
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-lg p-4 max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        <h4 className="font-semibold text-foreground">{submitLabel} Instance</h4>

        {/* Context - Required */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">
            Context *
          </label>
          <textarea
            placeholder="Where and how this idea appears..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full bg-secondary border border-border rounded-md p-2 text-sm text-foreground placeholder-muted-foreground resize-none h-20"
          />
          <p className="text-xs text-muted-foreground mt-1">
            The passage or situation where you encountered this idea
          </p>
        </div>

        {/* Location - Optional */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">
            Location (optional)
          </label>
          <Input
            placeholder="e.g., p. 42, Ch. 3, 2:30:45, Act 2 Scene 1"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="bg-secondary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Where in the source this appears
          </p>
        </div>

        {/* Meaning - Optional */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">
            Meaning (optional)
          </label>
          <textarea
            placeholder="What does this idea mean in this context?"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            className="w-full bg-secondary border border-border rounded-md p-2 text-sm text-foreground placeholder-muted-foreground resize-none h-16"
          />
          <p className="text-xs text-muted-foreground mt-1">
            The specific meaning or definition in this context
          </p>
        </div>

        {/* Interpretation - Optional */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">
            Interpretation (optional)
          </label>
          <textarea
            placeholder="Your interpretation or analysis of this idea..."
            value={interpretation}
            onChange={(e) => setInterpretation(e.target.value)}
            className="w-full bg-secondary border border-border rounded-md p-2 text-sm text-foreground placeholder-muted-foreground resize-none h-16"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your personal thoughts or analysis
          </p>
        </div>

        {/* Date Encountered - Optional */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">
            Date Encountered (optional)
          </label>
          <Input
            type="date"
            value={dateEncountered}
            onChange={(e) => setDateEncountered(e.target.value)}
            className="bg-secondary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            When you encountered this idea
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "Saving..." : submitLabel}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
