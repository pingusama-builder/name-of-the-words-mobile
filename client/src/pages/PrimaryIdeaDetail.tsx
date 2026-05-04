/**
 * Ideas Mode: Primary Idea Detail View
 * View and manage instances of a single idea across different contexts
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface PrimaryIdeaDetailProps {
  ideaId: number;
  onClose: () => void;
}

export default function PrimaryIdeaDetail({
  ideaId,
  onClose,
}: PrimaryIdeaDetailProps) {
  const [showAddInstance, setShowAddInstance] = useState(false);
  const [newInstanceContext, setNewInstanceContext] = useState("");
  const [newInstanceLocation, setNewInstanceLocation] = useState("");

  const queryClient = useQueryClient();

  // Fetch primary idea
  const { data: idea, isLoading: ideaLoading } =
    trpc.ideas.getPrimary.useQuery(ideaId);

  // Fetch instances
  const { data: instances = [], isLoading: instancesLoading } =
    trpc.ideas.getInstancesByIdea.useQuery(ideaId);

  // Create instance mutation
  const createInstanceMutation = trpc.ideas.createInstance.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ideas.getInstancesByIdea", ideaId],
      });
      setNewInstanceContext("");
      setNewInstanceLocation("");
      setShowAddInstance(false);
      toast.success("Instance added");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add instance");
    },
  });

  // Delete instance mutation
  const deleteInstanceMutation = trpc.ideas.deleteInstance.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ideas.getInstancesByIdea", ideaId],
      });
      toast.success("Instance deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete instance");
    },
  });

  const handleAddInstance = () => {
    if (!newInstanceContext.trim()) {
      toast.error("Context is required");
      return;
    }

    createInstanceMutation.mutate({
      ideaPrimaryId: ideaId,
      context: newInstanceContext,
      location: newInstanceLocation || undefined,
    });
  };

  const handleDeleteInstance = (id: number) => {
    if (confirm("Delete this instance?")) {
      deleteInstanceMutation.mutate(id);
    }
  };

  if (ideaLoading) {
    return (
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-lg p-4 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading idea...</div>
        </div>
      </motion.div>
    );
  }

  if (!idea) {
    return null;
  }

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-lg max-h-[90vh] overflow-y-auto"
    >
      {/* Header with back button */}
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-3">
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="h-8 w-8 p-0 flex-shrink-0"
          title="Back"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground">
            <path d="M10 2L4 8l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: idea.color || "#999" }}
          />
          <div className="min-w-0">
            <h3 className="text-lg font-serif font-bold text-foreground truncate">
              {idea.term}
            </h3>
            {idea.description && (
              <p className="text-sm text-muted-foreground truncate">
                {idea.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Instances Header */}
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">
            Instances ({instances.length})
          </h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddInstance(true)}
            className="gap-2"
          >
            <Plus className="w-3 h-3" />
            Add
          </Button>
        </div>

        {/* Instances List */}
        {instancesLoading ? (
          <div className="text-center text-muted-foreground">
            Loading instances...
          </div>
        ) : instances.length === 0 ? (
          <p className="text-sm text-muted-foreground">No instances yet</p>
        ) : (
          <div className="space-y-3">
            {instances.map((instance: any) => (
              <Card key={instance.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      {instance.context}
                    </p>
                    {instance.location && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📍 {instance.location}
                      </p>
                    )}
                    {instance.meaning && (
                      <p className="text-xs text-accent mt-2">
                        <strong>Meaning:</strong> {instance.meaning}
                      </p>
                    )}
                    {instance.interpretation && (
                      <p className="text-xs text-accent">
                        <strong>Interpretation:</strong> {instance.interpretation}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteInstance(instance.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Instance Sheet */}
      <AnimatePresence>
        {showAddInstance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddInstance(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddInstance && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-lg p-4"
          >
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Add Instance</h4>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Context *
                </label>
                <textarea
                  placeholder="Where and how this idea appears..."
                  value={newInstanceContext}
                  onChange={(e) => setNewInstanceContext(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-md p-2 text-sm text-foreground placeholder-muted-foreground resize-none h-20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Location (optional)
                </label>
                <Input
                  placeholder="e.g., p. 42, Ch. 3, 2:30:45"
                  value={newInstanceLocation}
                  onChange={(e) => setNewInstanceLocation(e.target.value)}
                  className="bg-secondary"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddInstance(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddInstance}
                  disabled={createInstanceMutation.isPending}
                  className="flex-1"
                >
                  {createInstanceMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
