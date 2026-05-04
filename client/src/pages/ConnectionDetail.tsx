/**
 * Ideas Mode: Connection Detail View
 * Create and manage connections between two ideas
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ConnectionDetailProps {
  networkId: number;
  ideas: any[];
  onClose: () => void;
}

type ConnectionType = "contrast" | "supports" | "contradicts" | "precedes" | "enables";

const CONNECTION_TYPES: { value: ConnectionType; label: string; description: string }[] = [
  { value: "contrast", label: "Contrasts with", description: "Opposing or different perspectives" },
  { value: "supports", label: "Supports", description: "Provides evidence or reinforcement" },
  { value: "contradicts", label: "Contradicts", description: "Directly opposes or refutes" },
  { value: "precedes", label: "Precedes", description: "Comes before logically or temporally" },
  { value: "enables", label: "Enables", description: "Makes possible or facilitates" },
];

export default function ConnectionDetail({
  networkId,
  ideas,
  onClose,
}: ConnectionDetailProps) {
  const [step, setStep] = useState<"select-first" | "select-second" | "type" | "description">(
    "select-first"
  );
  const [firstIdeaId, setFirstIdeaId] = useState<number | null>(null);
  const [secondIdeaId, setSecondIdeaId] = useState<number | null>(null);
  const [connectionType, setConnectionType] = useState<ConnectionType>("supports");
  const [description, setDescription] = useState("");

  const queryClient = useQueryClient();

  // Create connection mutation
  const createConnectionMutation = trpc.ideas.createConnection.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ideas.getNetworkWithDetails", networkId],
      });
      toast.success("Connection created");
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create connection");
    },
  });

  const handleCreateConnection = () => {
    if (!firstIdeaId || !secondIdeaId) {
      toast.error("Please select both ideas");
      return;
    }

    createConnectionMutation.mutate({
      ideaPrimaryIdA: firstIdeaId,
      ideaPrimaryIdB: secondIdeaId,
      connectionType,
      description: description || undefined,
    });
  };

  const firstIdea = ideas.find((i) => i.id === firstIdeaId);
  const secondIdea = ideas.find((i) => i.id === secondIdeaId);

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-lg max-h-[90vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
        <h3 className="text-lg font-serif font-bold text-foreground">
          {step === "select-first"
            ? "Select First Idea"
            : step === "select-second"
              ? "Select Second Idea"
              : step === "type"
                ? "Connection Type"
                : "Add Description"}
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Step 1: Select First Idea */}
        {step === "select-first" && (
          <>
            <div className="space-y-2">
              {ideas.map((idea) => (
                <Card
                  key={idea.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    firstIdeaId === idea.id
                      ? "bg-primary/15 border-primary/40"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => {
                    setFirstIdeaId(idea.id);
                    setStep("select-second");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: idea.color || "#999" }}
                    />
                    <span className="font-medium text-foreground">{idea.term}</span>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Select Second Idea */}
        {step === "select-second" && (
          <>
            <div className="mb-4 p-3 bg-card/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">First idea:</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: firstIdea?.color || "#999" }}
                />
                <span className="font-medium text-foreground">{firstIdea?.term}</span>
              </div>
            </div>

            <div className="space-y-2">
              {ideas
                .filter((i) => i.id !== firstIdeaId)
                .map((idea) => (
                  <Card
                    key={idea.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      secondIdeaId === idea.id
                        ? "bg-primary/15 border-primary/40"
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => {
                      setSecondIdeaId(idea.id);
                      setStep("type");
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: idea.color || "#999" }}
                      />
                      <span className="font-medium text-foreground">{idea.term}</span>
                    </div>
                  </Card>
                ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setStep("select-first")}
              className="w-full mt-4"
            >
              Back
            </Button>
          </>
        )}

        {/* Step 3: Select Connection Type */}
        {step === "type" && (
          <>
            <div className="mb-4 p-3 bg-card/50 rounded-lg border border-border/50 space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: firstIdea?.color || "#999" }}
                />
                <span className="font-medium text-foreground text-sm">{firstIdea?.term}</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: secondIdea?.color || "#999" }}
                />
                <span className="font-medium text-foreground text-sm">{secondIdea?.term}</span>
              </div>
            </div>

            <div className="space-y-2">
              {CONNECTION_TYPES.map((type) => (
                <Card
                  key={type.value}
                  className={`p-3 cursor-pointer transition-colors ${
                    connectionType === type.value
                      ? "bg-primary/15 border-primary/40"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => {
                    setConnectionType(type.value);
                    setStep("description");
                  }}
                >
                  <p className="font-medium text-foreground text-sm">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </Card>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setStep("select-second")}
              className="w-full mt-4"
            >
              Back
            </Button>
          </>
        )}

        {/* Step 4: Add Description */}
        {step === "description" && (
          <>
            <div className="mb-4 p-3 bg-card/50 rounded-lg border border-border/50 space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: firstIdea?.color || "#999" }}
                />
                <span className="font-medium text-foreground text-sm">{firstIdea?.term}</span>
              </div>
              <div className="text-xs text-accent uppercase font-semibold">
                {CONNECTION_TYPES.find((t) => t.value === connectionType)?.label}
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: secondIdea?.color || "#999" }}
                />
                <span className="font-medium text-foreground text-sm">{secondIdea?.term}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">
                Description (optional)
              </label>
              <textarea
                placeholder="Explain this connection..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-secondary border border-border rounded-md p-2 text-sm text-foreground placeholder-muted-foreground resize-none h-20"
              />
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setStep("type")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCreateConnection}
                disabled={createConnectionMutation.isPending}
                className="flex-1"
              >
                {createConnectionMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
