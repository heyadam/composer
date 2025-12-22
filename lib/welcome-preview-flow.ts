import type { Edge, Node } from "@xyflow/react";
import previewFlow from "@/lib/flows/welcome-preview.avy.json";

export const welcomePreviewNodes: Node[] = previewFlow.nodes as Node[];
export const welcomePreviewEdges: Edge[] = previewFlow.edges as Edge[];

export { previewFlow as welcomePreviewFlow };


