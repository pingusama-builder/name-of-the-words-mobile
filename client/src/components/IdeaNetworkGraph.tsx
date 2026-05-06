/**
 * Ideas Mode: Network Graph Visualization
 * Force-directed graph showing ideas as nodes and connections as edges
 * Supports node dragging, connection highlighting, and central thesis emphasis
 */

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface IdeaNode {
  id: number;
  term: string;
  color: string;
  isCentral?: boolean;
}

interface IdeaConnection {
  source: number;
  target: number;
  type: string;
  description?: string;
}

interface IdeaNetworkGraphProps {
  ideas: IdeaNode[];
  connections: IdeaConnection[];
  onNodeClick?: (ideaId: number) => void;
  onNodePositionChange?: (positions: Record<number, { x: number; y: number }>) => void;
  isLoading?: boolean;
  height?: number;
  focusedNodeId?: number | null;
  onFocusChange?: (nodeId: number | null) => void;
}

interface SimulationNode extends d3.SimulationNodeDatum {
  id: number;
  term: string;
  color: string;
  isCentral?: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimulationLink {
  source: SimulationNode | number;
  target: SimulationNode | number;
  type: string;
  description?: string;
}

export default function IdeaNetworkGraph({
  ideas,
  connections,
  onNodeClick,
  onNodePositionChange,
  isLoading = false,
  height = 400,
  focusedNodeId = null,
  onFocusChange,
}: IdeaNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);

  // Prepare data for D3
  const { nodes, links } = useMemo(() => {
    const nodes: SimulationNode[] = ideas.map((idea: IdeaNode) => ({
      id: idea.id,
      term: idea.term,
      color: idea.color,
      isCentral: idea.isCentral,
      x: Math.random() * 400,
      y: Math.random() * 400,
    }));

    const links: SimulationLink[] = connections.map((conn) => ({
      source: conn.source,
      target: conn.target,
      type: conn.type,
      description: conn.description,
    }));

    return { nodes, links };
  }, [ideas, connections]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0 || isLoading) return;

    const width = svgRef.current.clientWidth;
    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll("*").remove();

    // Create simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<SimulationNode, SimulationLink>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));
    
    simulationRef.current = simulation;

    // Create SVG groups
    const g = svg.append("g");

    // Draw links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d: any) => {
        if (d.type === "contrast") return "5,5";
        if (d.type === "contradicts") return "10,5";
        return "0";
      });

    // Draw nodes
    const node = g
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d: any) => (d.isCentral ? 28 : 20))
      .attr("fill", (d: any) => d.color)
      .attr("opacity", 0.8)
      .attr("stroke", (d: any) => (d.isCentral ? "white" : "none"))
      .attr("stroke-width", (d: any) => (d.isCentral ? 3 : 0))
      .attr("cursor", "pointer")
      .on("click", (event: any, d: any) => {
        event.stopPropagation();
        setSelectedNodeId(d.id);
        onNodeClick?.(d.id);
      })
      .on("mouseenter", (event: any, d: any) => {
        setHoveredNodeId(d.id);
      })
      .on("mouseleave", () => {
        setHoveredNodeId(null);
      })
      .call(
        d3
          .drag<any, SimulationNode>()
          .on("start", (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event: any, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            // Persist position
            onNodePositionChange?.({
              [d.id]: { x: d.x || 0, y: d.y || 0 },
            });
          })
      );

    // Draw labels
    const labels = g
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .attr("font-size", "11px")
      .attr("font-weight", (d: any) => (d.isCentral ? "bold" : "normal"))
      .attr("fill", "#fff")
      .attr("pointer-events", "none")
      .text((d: any) => d.term.substring(0, 8));

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as SimulationNode).x || 0)
        .attr("y1", (d: any) => (d.source as SimulationNode).y || 0)
        .attr("x2", (d: any) => (d.target as SimulationNode).x || 0)
        .attr("y2", (d: any) => (d.target as SimulationNode).y || 0);

      node
        .attr("cx", (d: any) => d.x || 0)
        .attr("cy", (d: any) => d.y || 0)
        .attr("opacity", (d: any) => {
          if (focusedNodeId !== null && d.id !== focusedNodeId) {
            // If focused on a node, dim others
            const isConnected = links.some(
              (l) =>
                (typeof l.source === 'object' && l.source && (l.source as SimulationNode).id === focusedNodeId && (l.target as SimulationNode).id === d.id) ||
                (typeof l.target === 'object' && l.target && (l.target as SimulationNode).id === focusedNodeId && (l.source as SimulationNode).id === d.id)
            );
            return isConnected ? 1 : 0.2;
          }
          if (hoveredNodeId === null) return 0.8;
          if (d.id === hoveredNodeId) return 1;
          // Check if connected to hovered node
          const isConnected = links.some(
            (l) =>
              (typeof l.source === 'object' && l.source && (l.source as SimulationNode).id === hoveredNodeId) ||
              (typeof l.target === 'object' && l.target && (l.target as SimulationNode).id === hoveredNodeId)
          );
          return isConnected ? 1 : 0.3;
        });

      labels
        .attr("x", (d: any) => d.x || 0)
        .attr("y", (d: any) => d.y || 0);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, links, height, hoveredNodeId, focusedNodeId, onNodeClick, onNodePositionChange, isLoading]);

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center bg-card/50 rounded-lg border border-border/50" style={{ height }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
          <Loader2 className="w-6 h-6 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="w-full flex items-center justify-center bg-card/50 rounded-lg border border-border/50" style={{ height }}>
        <p className="text-muted-foreground text-sm">No ideas in this network yet</p>
      </div>
    );
  }

  const handleCenterGraph = () => {
    if (focusedNodeId === null && simulationRef.current) {
      // Reset to show all nodes
      const simulation = simulationRef.current;
      simulation.alpha(1).restart();
    }
  };

  return (
    <div className="w-full bg-card/50 rounded-lg border border-border/50 overflow-hidden">
      <div className="relative">
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className="bg-background/50"
          style={{ cursor: "grab", touchAction: "none" }}
        />
        {/* Center/Reset Button */}
        <button
          onClick={handleCenterGraph}
          className="absolute top-3 right-3 bg-primary/80 hover:bg-primary text-primary-foreground rounded-full p-2 shadow-lg transition-colors z-10"
          title="Center graph"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
