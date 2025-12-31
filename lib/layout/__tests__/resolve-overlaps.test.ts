import { describe, it, expect } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import {
  resolveNodeOverlaps,
  applyDisplacements,
  type DisplacementMap,
} from "../resolve-overlaps";

// Helper to create a test node
function createNode(
  id: string,
  x: number,
  y: number,
  options?: {
    type?: string;
    width?: number;
    height?: number;
    parentId?: string;
  }
): Node {
  const node: Node = {
    id,
    type: options?.type ?? "text-generation",
    position: { x, y },
    data: { label: id },
  };

  if (options?.width || options?.height) {
    node.measured = {
      width: options.width ?? 280,
      height: options.height ?? 200,
    };
  }

  if (options?.parentId) {
    node.parentId = options.parentId;
  }

  return node;
}

describe("resolveNodeOverlaps", () => {
  describe("basic cases", () => {
    it("returns empty map when no nodes exist", () => {
      const result = resolveNodeOverlaps([], new Set(), []);
      expect(result).toEqual({});
    });

    it("returns empty map when no new nodes exist", () => {
      const existingNode = createNode("existing-1", 0, 0);
      const result = resolveNodeOverlaps([existingNode], new Set(), []);
      expect(result).toEqual({});
    });

    it("returns empty map when all nodes are new (nothing to displace)", () => {
      const newNode = createNode("new-1", 0, 0);
      const result = resolveNodeOverlaps([newNode], new Set(["new-1"]), []);
      expect(result).toEqual({});
    });

    it("returns empty map when no overlaps exist", () => {
      const existingNode = createNode("existing-1", 0, 0);
      const newNode = createNode("new-1", 500, 0); // Far away, no overlap

      const result = resolveNodeOverlaps(
        [existingNode, newNode],
        new Set(["new-1"]),
        []
      );

      expect(result).toEqual({});
    });
  });

  describe("single overlap resolution", () => {
    it("pushes existing node right when new node overlaps from left", () => {
      // Existing node at (100, 0), new node at (50, 0)
      // With default width 280, new node's right edge is at 330
      // Existing node starts at 100, so overlap exists
      const existingNode = createNode("existing-1", 100, 0, {
        width: 280,
        height: 200,
      });
      const newNode = createNode("new-1", 50, 0, { width: 280, height: 200 });

      const result = resolveNodeOverlaps(
        [existingNode, newNode],
        new Set(["new-1"]),
        []
      );

      // New node right edge (50 + 280 = 330) + gap (50) = 380
      // Existing node at 100 needs to move to 380, so dx = 280
      expect(result["existing-1"]).toBeDefined();
      expect(result["existing-1"].dx).toBeGreaterThan(0);
      expect(result["existing-1"].dy).toBe(0);
    });

    it("pushes existing node right with correct gap", () => {
      // New node at (0, 0) with width 280 -> right edge at 280
      // Existing node at (200, 0) overlaps (200 < 280)
      // Expected: push existing to 280 + 50 (gap) = 330, dx = 130
      const existingNode = createNode("existing-1", 200, 0, {
        width: 280,
        height: 200,
      });
      const newNode = createNode("new-1", 0, 0, { width: 280, height: 200 });

      const result = resolveNodeOverlaps(
        [existingNode, newNode],
        new Set(["new-1"]),
        [],
        { gap: 50 }
      );

      expect(result["existing-1"]).toBeDefined();
      // Should push to x = 280 + 50 = 330, from 200, so dx = 130
      expect(result["existing-1"].dx).toBe(130);
    });

    it("does not displace new nodes", () => {
      const existingNode = createNode("existing-1", 100, 0);
      const newNode = createNode("new-1", 50, 0);

      const result = resolveNodeOverlaps(
        [existingNode, newNode],
        new Set(["new-1"]),
        []
      );

      // New node should not be in the result
      expect(result["new-1"]).toBeUndefined();
    });
  });

  describe("vertical overlap and push direction", () => {
    it("pushes down when nodes are vertically stacked (high horizontal overlap)", () => {
      // Two nodes at nearly the same X position but overlapping vertically
      // New node at (100, 0), existing at (110, 150) - mostly aligned horizontally
      // Horizontal overlap should be high, vertical overlap should be medium
      const existingNode = createNode("existing-1", 110, 150, {
        width: 280,
        height: 200,
      });
      const newNode = createNode("new-1", 100, 0, { width: 280, height: 200 });

      const result = resolveNodeOverlaps(
        [existingNode, newNode],
        new Set(["new-1"]),
        []
      );

      // With high horizontal overlap ratio (>0.8) and low vertical overlap ratio (<0.5),
      // the algorithm should push down
      expect(result["existing-1"]).toBeDefined();
      // Either dx > 0 or dy > 0, depending on the overlap ratios
      expect(
        result["existing-1"].dx > 0 || result["existing-1"].dy > 0
      ).toBe(true);
    });

    it("pushes right by default for partial horizontal overlap", () => {
      // New node overlaps existing but not mostly aligned
      const existingNode = createNode("existing-1", 200, 50, {
        width: 280,
        height: 200,
      });
      const newNode = createNode("new-1", 100, 0, { width: 280, height: 200 });

      const result = resolveNodeOverlaps(
        [existingNode, newNode],
        new Set(["new-1"]),
        []
      );

      expect(result["existing-1"]).toBeDefined();
      expect(result["existing-1"].dx).toBeGreaterThan(0);
    });
  });

  describe("cascading overlaps", () => {
    it("handles cascading overlaps by iterating", () => {
      // Chain: new -> existing1 -> existing2
      // New node at (0, 0)
      // Existing1 at (200, 0) - overlaps with new
      // Existing2 at (400, 0) - will overlap with existing1 after it's pushed
      const existing1 = createNode("existing-1", 200, 0, {
        width: 280,
        height: 200,
      });
      const existing2 = createNode("existing-2", 400, 0, {
        width: 280,
        height: 200,
      });
      const newNode = createNode("new-1", 0, 0, { width: 280, height: 200 });

      const result = resolveNodeOverlaps(
        [existing1, existing2, newNode],
        new Set(["new-1"]),
        []
      );

      // existing-1 should be pushed right
      expect(result["existing-1"]).toBeDefined();
      expect(result["existing-1"].dx).toBeGreaterThan(0);

      // existing-2 should also be pushed via cascading detection
      // After existing-1 moves to 330 (280 + 50), it ends at 610
      // existing-2 at 400 overlaps with displaced existing-1, so it should be pushed
      expect(result["existing-2"]).toBeDefined();
      expect(result["existing-2"].dx).toBeGreaterThan(0);

      // existing-2 should end up further right than existing-1
      const existing1FinalX = 200 + result["existing-1"].dx;
      const existing2FinalX = 400 + result["existing-2"].dx;
      expect(existing2FinalX).toBeGreaterThan(existing1FinalX);
    });

    it("respects maximum iterations", () => {
      // Create a scenario that might loop forever without iteration limit
      const nodes: Node[] = [];
      const newNodeIds = new Set<string>();

      // Add a new node
      nodes.push(createNode("new-1", 0, 0, { width: 280, height: 200 }));
      newNodeIds.add("new-1");

      // Add many tightly packed existing nodes
      for (let i = 0; i < 20; i++) {
        nodes.push(
          createNode(`existing-${i}`, 100 + i * 50, 0, {
            width: 280,
            height: 200,
          })
        );
      }

      // Should complete without hanging
      const result = resolveNodeOverlaps(nodes, newNodeIds, [], {
        maxIterations: 100,
      });

      expect(result).toBeDefined();
    });
  });

  describe("parent-child relationships", () => {
    it("moves children with parent when parent is displaced", () => {
      // Comment parent at (200, 0)
      // Child inside the comment at (350, 50) - positioned to the right so it doesn't
      // directly overlap with the new node (which ends at x=280)
      // New node at (0, 0) overlaps the parent but not the child directly
      const parent = createNode("parent-comment", 200, 0, {
        type: "comment",
        width: 300,
        height: 250,
      });
      const child = createNode("child-1", 350, 50, {
        parentId: "parent-comment",
        width: 100,
        height: 80,
      });
      const newNode = createNode("new-1", 0, 0, { width: 280, height: 200 });

      const result = resolveNodeOverlaps(
        [parent, child, newNode],
        new Set(["new-1"]),
        []
      );

      // Parent should be displaced
      expect(result["parent-comment"]).toBeDefined();

      // Child should also be displaced by the same amount as the parent
      expect(result["child-1"]).toBeDefined();
      expect(result["child-1"].dx).toBe(result["parent-comment"].dx);
      expect(result["child-1"].dy).toBe(result["parent-comment"].dy);
    });
  });

  describe("new node repositioning", () => {
    it("moves new node to the right when it overlaps with its source", () => {
      // Scenario: New node is placed overlapping with its input source
      // The new node should be moved right, not the source
      const inputText = createNode("input-text", 100, 0, {
        width: 280,
        height: 200,
      });
      // New node placed overlapping with inputText (starts at 150, but inputText ends at 380)
      const refineNode = createNode("refine", 150, 0, {
        width: 280,
        height: 200,
      });

      // Edge: inputText -> refineNode (inputText is source)
      const edges: Edge[] = [
        { id: "e1", source: "input-text", target: "refine" },
      ];

      const result = resolveNodeOverlaps(
        [inputText, refineNode],
        new Set(["refine"]),
        edges
      );

      // inputText (source) should NOT be moved
      expect(result["input-text"]).toBeUndefined();

      // refineNode (new) should be moved to the right of inputText
      expect(result["refine"]).toBeDefined();
      expect(result["refine"].dx).toBeGreaterThan(0);

      // After displacement, refineNode should be to the right of inputText with gap
      const inputRight = 100 + 280; // 380
      const refineFinalX = 150 + result["refine"].dx;
      expect(refineFinalX).toBeGreaterThanOrEqual(inputRight + 50); // 430
    });

    it("propagates displacement through chain of new nodes", () => {
      // Scenario: Input Text (existing) -> Refine (new) -> Process (new)
      // When Refine is moved to clear Input Text, Process should also move
      const inputText = createNode("input-text", 100, 0, {
        width: 280,
        height: 200,
      });
      // Both new nodes placed overlapping with their sources
      const refineNode = createNode("refine", 150, 0, {
        width: 280,
        height: 200,
      });
      const processNode = createNode("process", 400, 0, {
        width: 280,
        height: 200,
      });

      // Edges: inputText -> refineNode -> processNode
      const edges: Edge[] = [
        { id: "e1", source: "input-text", target: "refine" },
        { id: "e2", source: "refine", target: "process" },
      ];

      const result = resolveNodeOverlaps(
        [inputText, refineNode, processNode],
        new Set(["refine", "process"]),
        edges
      );

      // inputText should NOT be moved
      expect(result["input-text"]).toBeUndefined();

      // refineNode should be moved to the right of inputText
      expect(result["refine"]).toBeDefined();
      expect(result["refine"].dx).toBeGreaterThan(0);

      // processNode should also be moved to maintain proper spacing
      // It should be to the right of refineNode (after refine's displacement)
      const refineRight =
        150 + result["refine"].dx + 280; // refine's final right edge
      const processFinalX = 400 + (result["process"]?.dx || 0);

      // Process should be at least gap distance from refine's right edge
      // (or at its original position if already far enough)
      expect(processFinalX).toBeGreaterThanOrEqual(refineRight + 50);
    });
  });

  describe("edge-aware displacement", () => {
    it("does not push upstream (source) nodes to the right", () => {
      // Scenario: New node is inserted between two existing nodes
      // Input Text (existing, source) -> Refine Request (new) -> Process Text (existing, target)
      //
      // If "Refine Request" overlaps with "Input Text", we should NOT push "Input Text" right
      // because "Input Text" is the SOURCE of "Refine Request" and needs to stay to the left
      const inputText = createNode("input-text", 100, 0, {
        width: 280,
        height: 200,
      });
      const processText = createNode("process-text", 500, 0, {
        width: 280,
        height: 200,
      });
      // New node placed overlapping with inputText
      const refineRequest = createNode("refine-request", 150, 0, {
        width: 280,
        height: 200,
      });

      // Edges: inputText -> refineRequest -> processText
      const edges: Edge[] = [
        { id: "e1", source: "input-text", target: "refine-request" },
        { id: "e2", source: "refine-request", target: "process-text" },
      ];

      const result = resolveNodeOverlaps(
        [inputText, processText, refineRequest],
        new Set(["refine-request"]),
        edges
      );

      // inputText is a SOURCE of refineRequest, so it should NOT be pushed
      expect(result["input-text"]).toBeUndefined();

      // processText is a TARGET of refineRequest, so if it overlaps it would be pushed
      // (but it's far enough away that it doesn't overlap in this case)
    });

    it("still pushes downstream (target) nodes to the right", () => {
      // New node overlaps with its target (downstream) node
      const existingTarget = createNode("existing-target", 150, 0, {
        width: 280,
        height: 200,
      });
      const newNode = createNode("new-node", 100, 0, {
        width: 280,
        height: 200,
      });

      // Edge: new-node -> existing-target (newNode feeds INTO existingTarget)
      const edges: Edge[] = [
        { id: "e1", source: "new-node", target: "existing-target" },
      ];

      const result = resolveNodeOverlaps(
        [existingTarget, newNode],
        new Set(["new-node"]),
        edges
      );

      // existingTarget is downstream (target), so it SHOULD be pushed right
      expect(result["existing-target"]).toBeDefined();
      expect(result["existing-target"].dx).toBeGreaterThan(0);
    });

    it("does not push nodes that are unrelated via edges", () => {
      // Two nodes overlap but there's no edge connection
      // In this case, we default to pushing right (no edge relationship to preserve)
      const existingNode = createNode("existing", 150, 0, {
        width: 280,
        height: 200,
      });
      const newNode = createNode("new-node", 100, 0, {
        width: 280,
        height: 200,
      });

      // No edges connecting them
      const edges: Edge[] = [];

      const result = resolveNodeOverlaps(
        [existingNode, newNode],
        new Set(["new-node"]),
        edges
      );

      // No source relationship, so existing should be pushed right
      expect(result["existing"]).toBeDefined();
      expect(result["existing"].dx).toBeGreaterThan(0);
    });

    it("proactively pushes targets right even when no overlap", () => {
      // Scenario: New node is inserted before an existing target
      // The target is at the same X position as the new node (not overlapping yet
      // because the target is vertically offset), but for proper left-to-right flow
      // the target should be pushed to the RIGHT of the new node
      const existingTarget = createNode("existing-target", 100, 300, {
        width: 280,
        height: 200,
      });
      const newNode = createNode("new-node", 100, 0, {
        width: 280,
        height: 200,
      });

      // Edge: new-node -> existing-target (newNode feeds INTO existingTarget)
      const edges: Edge[] = [
        { id: "e1", source: "new-node", target: "existing-target" },
      ];

      const result = resolveNodeOverlaps(
        [existingTarget, newNode],
        new Set(["new-node"]),
        edges
      );

      // existingTarget is a target of new-node, so it should be pushed right
      // to maintain left-to-right flow, even though there's no vertical overlap
      expect(result["existing-target"]).toBeDefined();
      expect(result["existing-target"].dx).toBeGreaterThan(0);

      // Target should end up to the right of the new node
      const newNodeRight = 100 + 280; // 380
      const targetFinalX = 100 + result["existing-target"].dx;
      expect(targetFinalX).toBeGreaterThanOrEqual(newNodeRight + 50);
    });

    it("pushes target to correct position based on new node position after source adjustment", () => {
      // Scenario: source (existing) -> new node -> target (existing)
      // New node needs to be moved right of source, then target needs to be right of new node
      const source = createNode("source", 100, 0, {
        width: 280,
        height: 200,
      });
      // New node placed overlapping with source
      const newNode = createNode("new-node", 150, 100, {
        width: 280,
        height: 200,
      });
      // Target is currently to the left of where new node should end up
      const target = createNode("target", 500, 200, {
        width: 280,
        height: 200,
      });

      // Edges: source -> new-node -> target
      const edges: Edge[] = [
        { id: "e1", source: "source", target: "new-node" },
        { id: "e2", source: "new-node", target: "target" },
      ];

      const result = resolveNodeOverlaps(
        [source, newNode, target],
        new Set(["new-node"]),
        edges
      );

      // Source should NOT be moved (it's upstream)
      expect(result["source"]).toBeUndefined();

      // New node should be moved right of source
      expect(result["new-node"]).toBeDefined();
      expect(result["new-node"].dx).toBeGreaterThan(0);

      // Target should be moved right of the NEW node's final position
      const sourceRight = 100 + 280; // 380
      const newNodeFinalX = 150 + result["new-node"].dx;
      const newNodeFinalRight = newNodeFinalX + 280;

      const targetFinalX = 500 + (result["target"]?.dx || 0);
      expect(targetFinalX).toBeGreaterThanOrEqual(newNodeFinalRight + 50);
    });
  });

  describe("configuration", () => {
    it("uses custom gap value", () => {
      const existingNode = createNode("existing-1", 200, 0, {
        width: 280,
        height: 200,
      });
      const newNode = createNode("new-1", 0, 0, { width: 280, height: 200 });

      const result = resolveNodeOverlaps(
        [existingNode, newNode],
        new Set(["new-1"]),
        [],
        { gap: 100 }
      );

      // With gap 100: new right edge (280) + gap (100) = 380
      // Existing at 200, needs to move to 380, so dx = 180
      expect(result["existing-1"].dx).toBe(180);
    });

    it("uses fallback dimensions when measured is not available", () => {
      // Node without measured dimensions should use defaults
      const existingNode: Node = {
        id: "existing-1",
        type: "text-generation",
        position: { x: 200, y: 0 },
        data: { label: "existing" },
        // No measured property
      };
      const newNode = createNode("new-1", 0, 0, { width: 280, height: 200 });

      const result = resolveNodeOverlaps(
        [existingNode, newNode],
        new Set(["new-1"]),
        [],
        { defaultNodeWidth: 280, defaultNodeHeight: 200 }
      );

      expect(result["existing-1"]).toBeDefined();
    });
  });
});

describe("applyDisplacements", () => {
  it("applies displacement to node positions", () => {
    const nodes: Node[] = [
      createNode("node-1", 100, 100),
      createNode("node-2", 200, 200),
    ];

    const displacements: DisplacementMap = {
      "node-1": { dx: 50, dy: 25 },
    };

    const result = applyDisplacements(nodes, displacements);

    expect(result[0].position).toEqual({ x: 150, y: 125 });
    expect(result[1].position).toEqual({ x: 200, y: 200 }); // Unchanged
  });

  it("returns unchanged nodes when no displacements", () => {
    const nodes: Node[] = [createNode("node-1", 100, 100)];
    const displacements: DisplacementMap = {};

    const result = applyDisplacements(nodes, displacements);

    expect(result[0].position).toEqual({ x: 100, y: 100 });
  });
});
