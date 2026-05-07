/**
 * Ideas Mode: Network Management View
 * Main interface for creating, browsing, and managing idea networks
 * Inspired by Adler's analytical reading methodology
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import IdeaNetworkDetail from "./IdeaNetworkDetail";
import ConnectNetworkDialog from "@/components/ConnectNetworkDialog";

interface IdeaNetwork {
  id: number;
  title: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  primarySource: string | null;
}

export default function IdeaNetworkView() {
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [newNetworkTitle, setNewNetworkTitle] = useState("");
  const [newNetworkDescription, setNewNetworkDescription] = useState("");
  const [selectedNetworkId, setSelectedNetworkId] = useState<number | null>(null);
  const [showNetworkDetail, setShowNetworkDetail] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [networkToConnect, setNetworkToConnect] = useState<number | null>(null);

  const queryClient = useQueryClient();

  // Fetch all networks
  const { data: networks = [], isLoading } = trpc.ideas.listNetworks.useQuery();

  // Create network mutation
  const createNetworkMutation = trpc.ideas.createNetwork.useMutation({
    onSuccess: () => {
      // Use tRPC utils for proper cache invalidation
      trpc.useUtils().ideas.listNetworks.invalidate();
      setNewNetworkTitle("");
      setNewNetworkDescription("");
      setShowCreateSheet(false);
      toast.success("Network created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create network");
    },
  });

  // Delete network mutation
  const deleteNetworkMutation = trpc.ideas.deleteNetwork.useMutation({
    onSuccess: () => {
      // Use tRPC utils for proper cache invalidation
      trpc.useUtils().ideas.listNetworks.invalidate();
      toast.success("Network deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete network");
    },
  });

  const handleCreateNetwork = async () => {
    if (!newNetworkTitle.trim()) {
      toast.error("Network title is required");
      return;
    }

    createNetworkMutation.mutate({
      title: newNetworkTitle,
      description: newNetworkDescription || undefined,
      ideaPrimaryIds: [],
    });
  };

  const handleDeleteNetwork = (id: number) => {
    if (confirm("Delete this network? This cannot be undone.")) {
      deleteNetworkMutation.mutate(id);
    }
  };

  const handleViewNetwork = (id: number) => {
    setSelectedNetworkId(id);
    setShowNetworkDetail(true);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-xl font-serif font-bold text-foreground">
              Idea Networks
            </h2>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreateSheet(true)}
            className="gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            New
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Organize key terms and their relationships
        </p>
      </div>

      {/* Networks List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading networks...</div>
          </div>
        ) : networks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-muted-foreground mb-4">No networks yet</p>
            <Button
              size="sm"
              onClick={() => setShowCreateSheet(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Network
            </Button>
          </div>
        ) : (
          <AnimatePresence>
            {networks.map((network: IdeaNetwork) => (
              <motion.div
                key={network.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => handleViewNetwork(network.id)}
                    >
                      <h3 className="font-semibold text-foreground truncate">
                        {network.title}
                      </h3>
                      {network.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {network.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewNetwork(network.id)}
                        className="h-8 w-8 p-0"
                        title="View network"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setNetworkToConnect(network.id);
                          setShowConnectDialog(true);
                        }}
                        className="h-8 w-8 p-0 hover:text-accent"
                        title="Connect to another network"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 5H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2m-4-4h6m0 0l-2-2m2 2l-2 2" />
                        </svg>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteNetwork(network.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete network"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Create Network Sheet */}
      <AnimatePresence>
        {showCreateSheet && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-lg p-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Network Title
                </label>
                <Input
                  placeholder="e.g., Thin-slicing vs Thick-slicing"
                  value={newNetworkTitle}
                  onChange={(e) => setNewNetworkTitle(e.target.value)}
                  className="bg-secondary"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Description (optional)
                </label>
                <textarea
                  placeholder="Add context or notes about this network..."
                  value={newNetworkDescription}
                  onChange={(e) => setNewNetworkDescription(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-md p-2 text-sm text-foreground placeholder-muted-foreground resize-none h-20"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateSheet(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateNetwork}
                  disabled={createNetworkMutation.isPending}
                  className="flex-1"
                >
                  {createNetworkMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowCreateSheet(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center z-40 hover:shadow-xl transition-shadow"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Connect Network Dialog */}
      {networkToConnect && (
        <ConnectNetworkDialog
          sourceNetworkId={networkToConnect}
          isOpen={showConnectDialog}
          onClose={() => {
            setShowConnectDialog(false);
            setNetworkToConnect(null);
          }}
          onSuccess={() => {
            trpc.useUtils().ideas.listNetworks.invalidate();
          }}
        />
      )}

      {/* Network Detail Modal */}
      <AnimatePresence>
        {showNetworkDetail && selectedNetworkId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background"
          >
            <IdeaNetworkDetail
              networkId={selectedNetworkId}
              onClose={() => {
                setShowNetworkDetail(false);
                setSelectedNetworkId(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
