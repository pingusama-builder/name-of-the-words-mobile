/**
 * Connect Network Dialog
 * Allows users to connect two idea networks together with a relationship type
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ConnectNetworkDialogProps {
  sourceNetworkId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ConnectNetworkDialog({
  sourceNetworkId,
  isOpen,
  onClose,
  onSuccess,
}: ConnectNetworkDialogProps) {
  const [targetNetworkId, setTargetNetworkId] = useState<number | null>(null);
  const [connectionType, setConnectionType] = useState<string>("related");
  const [description, setDescription] = useState("");
  const [strength, setStrength] = useState(5);

  const { data: networks = [] } = trpc.ideas.listNetworks.useQuery();

  const createConnectionMutation = trpc.ideas.createNetworkConnection.useMutation({
    onSuccess: () => {
      toast.success("Networks connected");
      setTargetNetworkId(null);
      setConnectionType("related");
      setDescription("");
      setStrength(5);
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to connect networks");
    },
  });

  const handleConnect = () => {
    if (!targetNetworkId) {
      toast.error("Please select a network to connect to");
      return;
    }

    if (targetNetworkId === sourceNetworkId) {
      toast.error("Cannot connect a network to itself");
      return;
    }

    createConnectionMutation.mutate({
      networkIdA: sourceNetworkId,
      networkIdB: targetNetworkId,
      connectionType: connectionType as any,
      description: description || undefined,
      strength,
    });
  };

  // Filter out the source network and already connected networks
  const availableNetworks = networks.filter((n: any) => n.id !== sourceNetworkId);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="w-full bg-background rounded-t-lg border-t border-border p-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Connect Network
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

            <div className="space-y-4">
              {/* Target Network Selection */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Connect to Network
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableNetworks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No other networks available
                    </p>
                  ) : (
                    availableNetworks.map((network: any) => (
                      <Card
                        key={network.id}
                        className={`p-3 cursor-pointer transition-colors ${
                          targetNetworkId === network.id
                            ? "bg-accent border-accent-foreground"
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() => setTargetNetworkId(network.id)}
                      >
                        <h4 className="font-medium text-foreground">
                          {network.title}
                        </h4>
                        {network.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {network.description}
                          </p>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Connection Type */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Relationship Type
                </label>
                <select
                  value={connectionType}
                  onChange={(e) => setConnectionType(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-md p-2 text-sm text-foreground"
                >
                  <option value="related">Related</option>
                  <option value="contrast">Contrast</option>
                  <option value="supports">Supports</option>
                  <option value="contradicts">Contradicts</option>
                  <option value="precedes">Precedes</option>
                  <option value="enables">Enables</option>
                </select>
              </div>

              {/* Strength */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Connection Strength: {strength}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={strength}
                  onChange={(e) => setStrength(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Description (optional)
                </label>
                <textarea
                  placeholder="Explain how these networks relate..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-md p-2 text-sm text-foreground placeholder-muted-foreground resize-none h-20"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={
                    !targetNetworkId || createConnectionMutation.isPending
                  }
                  className="flex-1"
                >
                  {createConnectionMutation.isPending ? "Connecting..." : "Connect"}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
