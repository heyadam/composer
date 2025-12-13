import type { Node, Edge } from "@xyflow/react";

/**
 * Schema version for saved flows.
 * Increment this when making breaking changes to the schema.
 */
export const FLOW_SCHEMA_VERSION = 1;

/**
 * Metadata about a saved flow
 */
export interface FlowMetadata {
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

/**
 * A saved flow document
 */
export interface SavedFlow {
  metadata: FlowMetadata;
  nodes: Node[];
  edges: Edge[];
}

/**
 * Validation result for loaded flows
 */
export interface FlowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Result of loading a flow
 */
export interface LoadFlowResult {
  success: boolean;
  flow?: SavedFlow;
  error?: string;
  validation?: FlowValidationResult;
}
