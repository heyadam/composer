import type { Node, Edge } from "@xyflow/react";
import defaultFlow from "@/lib/flows/default-flow.json";

// Export the default flow nodes and edges for initial state
export const initialNodes: Node[] = defaultFlow.nodes as Node[];
export const initialEdges: Edge[] = defaultFlow.edges as Edge[];

// Export the full default flow for reference
export { defaultFlow };
