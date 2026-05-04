import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import type { Word } from "@shared/schema";

interface AddToIdeaDialogProps {
  word: Word;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "select-network" | "select-idea" | "create-idea";

export default function AddToIdeaDialog({
  word,
  isOpen,
  onClose,
  onSuccess,
}: AddToIdeaDialogProps) {
  const [step, setStep] = useState<Step>("select-network");
  const [selectedNetworkId, setSelectedNetworkId] = useState<number | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<number | null>(null);
  const [newIdeaTerm, setNewIdeaTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Queries
  const { data: networks = [] } = trpc.ideas.listNetworks.useQuery() as any;
  const { data: networkDetails } = trpc.ideas.getNetworkWithDetails.useQuery(
    selectedNetworkId || 0,
    { enabled: !!selectedNetworkId }
  );

  // Mutations
  const createInstanceMutation = trpc.ideas.createInstance.useMutation();
  const createPrimaryMutation = trpc.ideas.createPrimary.useMutation();
  const updateNetworkMutation = trpc.ideas.updateNetwork.useMutation();

  const handleCreateInstance = async () => {
    if (!selectedNetworkId || !selectedIdeaId) return;

    setIsCreating(true);
    try {
      // Create instance linking word to idea
      await createInstanceMutation.mutateAsync({
        ideaPrimaryId: selectedIdeaId,
        wordId: word.id,
        context: word.context || "",
        source: word.source || undefined,
        location: word.location || undefined,
        meaning: word.meaning || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to create instance:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateIdeaAndInstance = async () => {
    if (!selectedNetworkId || !newIdeaTerm.trim()) return;

    setIsCreating(true);
    try {
      // Create new primary idea
      const newIdea = await createPrimaryMutation.mutateAsync({
        term: newIdeaTerm,
        description: undefined,
        originLanguage: word.originLanguage,
      });

      // Add idea to network
      const currentIdeas = networkDetails?.ideas.map((idea) => idea.id) || [];
      await updateNetworkMutation.mutateAsync({
        id: selectedNetworkId,
        ideaPrimaryIds: [...currentIdeas, newIdea.id],
      });

      // Create instance linking word to new idea
      await createInstanceMutation.mutateAsync({
        ideaPrimaryId: newIdea.id,
        wordId: word.id,
        context: word.context || "",
        source: word.source || undefined,
        location: word.location || undefined,
        meaning: word.meaning || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to create idea and instance:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  const ideas = networkDetails?.ideas || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="w-full bg-background rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              {step === "select-network" && "Select Network"}
              {step === "select-idea" && "Select Idea"}
              {step === "create-idea" && "Create New Idea"}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground/60 hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {/* Step: Select Network */}
          {step === "select-network" && (
            <div className="space-y-3">
              {networks.length === 0 ? (
                <p className="text-sm text-muted-foreground/60 py-4">
                  No networks yet. Create one first.
                </p>
              ) : (
                networks.map((network: any) => (
                  <button
                    key={network.id}
                    onClick={() => {
                      setSelectedNetworkId(network.id);
                      setStep("select-idea");
                    }}
                    className="w-full p-4 rounded-lg border border-border/20 hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                  >
                    <p className="font-medium text-foreground">{network.title}</p>
                    {network.description && (
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {network.description}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Step: Select Idea */}
          {step === "select-idea" && (
            <div className="space-y-3">
              {ideas.length === 0 ? (
                <p className="text-sm text-muted-foreground/60 py-4">
                  No ideas in this network.
                </p>
              ) : (
                ideas.map((ideaLink: any) => (
                  <button
                    key={ideaLink.ideaPrimaryId}
                    onClick={() => {
                      setSelectedIdeaId(ideaLink.ideaPrimaryId);
                      setStep("select-idea"); // Will proceed to create instance
                    }}
                    className="w-full p-4 rounded-lg border border-border/20 hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ideaLink.color || "#888" }}
                      />
                      <p className="font-medium text-foreground">
                        {ideaLink.term}
                      </p>
                    </div>
                  </button>
                ))
              )}

              {/* Create New Idea Option */}
              <button
                onClick={() => setStep("create-idea")}
                className="w-full p-4 rounded-lg border border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-all text-left text-primary/70 hover:text-primary"
              >
                + Create New Idea
              </button>
            </div>
          )}

          {/* Step: Create Idea */}
          {step === "create-idea" && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter idea term (e.g., 'thin-slicing')"
                value={newIdeaTerm}
                onChange={(e) => setNewIdeaTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border/20 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
              <p className="text-xs text-muted-foreground/60">
                This will create a new idea and add the current word as an instance.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => {
                if (step === "select-network") {
                  onClose();
                } else if (step === "select-idea") {
                  setStep("select-network");
                } else {
                  setStep("select-idea");
                }
              }}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border/20 text-foreground hover:bg-muted/20 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (step === "select-idea" && selectedIdeaId) {
                  handleCreateInstance();
                } else if (step === "create-idea" && newIdeaTerm.trim()) {
                  handleCreateIdeaAndInstance();
                }
              }}
              disabled={
                isCreating ||
                (step === "select-idea" && !selectedIdeaId) ||
                (step === "create-idea" && !newIdeaTerm.trim())
              }
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isCreating ? "Adding..." : "Add"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
