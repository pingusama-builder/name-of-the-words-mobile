/**
 * Ideas Mode: Network Detail View
 * View and manage ideas within a network, add instances, and create connections
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import IdeaNetworkGraph from "@/components/IdeaNetworkGraph";
import ConnectionDetail from "@/pages/ConnectionDetail";
import PrimaryIdeaDetail from "@/pages/PrimaryIdeaDetail";

interface IdeaNetworkDetailProps {
  networkId: number;
  onClose: () => void;
}

export default function IdeaNetworkDetail({
  networkId,
  onClose,
}: IdeaNetworkDetailProps) {
  const [showAddIdea, setShowAddIdea] = useState(false);
  const [newIdeaTerm, setNewIdeaTerm] = useState("");
  const [selectedIdeaId, setSelectedIdeaId] = useState<number | null>(null);
  const [showPrimaryDetail, setShowPrimaryDetail] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);

  const queryClient = useQueryClient();

  // Fetch network with details
  const { data: networkDetails, isLoading } =
    trpc.ideas.getNetworkWithDetails.useQuery(networkId);

  // Create primary idea mutation
  const createIdeaMutation = trpc.ideas.createPrimary.useMutation({
    onSuccess: () => {
      invalidateNetwork();
      setNewIdeaTerm("");
      setShowAddIdea(false);
      toast.success("Idea created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create idea");
    },
  });

  // Invalidate network details after mutations
  const invalidateNetwork = () => {
    queryClient.invalidateQueries({
      queryKey: ["ideas.getNetworkWithDetails", networkId],
    });
  };

  const handleCreateIdea = async () => {
    if (!newIdeaTerm.trim()) {
      toast.error("Idea term is required");
      return;
    }

    createIdeaMutation.mutate({
      term: newIdeaTerm,
      description: "",
      originLanguage: "english",
    });
  };

  const handleSelectIdea = (ideaId: number) => {
    setSelectedIdeaId(ideaId);
    setShowPrimaryDetail(true);
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-lg p-4 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading network...</div>
        </div>
      </motion.div>
    );
  }

  if (!networkDetails?.network) {
    return null;
  }

  const { network, ideas = [], instances = {}, connections = [] } = networkDetails || {};

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-lg max-h-[90vh] overflow-y-auto"
    >
      {/* Header with back button */}
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center gap-3 justify-between">
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
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-serif font-bold text-foreground truncate">
            {network.title}
          </h3>
          {network.description && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {network.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowGraph(!showGraph)}
            className="text-xs"
          >
            {showGraph ? "List" : "Graph"}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Graph View */}
        {showGraph && (
          <div className="space-y-4">
            <IdeaNetworkGraph
              ideas={ideas.map((idea: any) => ({
                ...idea,
                color: idea.color || "#999",
              }))}
              connections={connections.map((conn: any) => ({
                source: conn.ideaPrimaryIdA,
                target: conn.ideaPrimaryIdB,
                type: conn.connectionType || "related",
                description: conn.description,
              }))}
              onNodeClick={(ideaId) => {
                setSelectedIdeaId(ideaId);
              }}
              height={300}
            />
            <Button
              onClick={() => setShowConnectionForm(true)}
              className="w-full"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Connection
            </Button>
          </div>
        )}

        {/* List View */}
        {!showGraph && (
          <>
            {/* Ideas Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground">Key Ideas</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddIdea(true)}
                  className="gap-2"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>

              {ideas.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ideas yet</p>
              ) : (
                <div className="space-y-2">
                  {ideas.map((idea: any) => (
                    <Card
                      key={idea.id}
                      className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleSelectIdea(idea.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: idea?.color || "#999" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {idea?.term || "Unknown"}
                          </p>
                          {idea?.isCentral && (
                            <p className="text-xs text-accent font-semibold">
                              Central Thesis
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(instances && instances[idea?.id])?.length || 0} instances
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Connections Section */}
            {connections.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Relationships</h4>
                <div className="space-y-2">
                  {connections.map((conn: any) => (
                    <Card key={conn.id} className="p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground truncate">
                          {ideas.find((i: any) => i.id === conn.ideaPrimaryIdA)
                            ?.term || "Unknown"}
                        </span>
                        <Link2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-accent uppercase font-semibold flex-shrink-0">
                          {conn.connectionType}
                        </span>
                        <span className="font-medium text-foreground truncate">
                          {ideas.find((i: any) => i.id === conn.ideaPrimaryIdB)
                            ?.term || "Unknown"}
                        </span>
                      </div>
                      {conn.description && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {conn.description}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Primary Idea Detail Modal */}
      <AnimatePresence>
        {showPrimaryDetail && selectedIdeaId && (
          <PrimaryIdeaDetail
            ideaId={selectedIdeaId}
            onClose={() => {
              setShowPrimaryDetail(false);
              setSelectedIdeaId(null);
              invalidateNetwork();
            }}
          />
        )}
      </AnimatePresence>

      {/* Connection Form */}
      <AnimatePresence>
        {showConnectionForm && (
          <ConnectionDetail
            networkId={networkId}
            ideas={ideas}
            onClose={() => setShowConnectionForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Add Idea Sheet */}
      <AnimatePresence>
        {showAddIdea && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddIdea(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddIdea && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-lg p-4"
          >
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Add New Idea</h4>
              <Input
                placeholder="Enter idea term..."
                value={newIdeaTerm}
                onChange={(e) => setNewIdeaTerm(e.target.value)}
                className="bg-secondary"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddIdea(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateIdea}
                  disabled={createIdeaMutation.isPending}
                  className="flex-1"
                >
                  {createIdeaMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
