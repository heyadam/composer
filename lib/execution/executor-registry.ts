/**
 * Node Executor Registry
 *
 * Manages registration and lookup of node executors.
 * Each node type registers its executor, which the engine uses for execution.
 */

import type { NodeExecutor } from "./executors/types";

const executors = new Map<string, NodeExecutor>();

/**
 * Register a node executor.
 * @param executor - The executor to register
 */
export function registerExecutor(executor: NodeExecutor): void {
  if (executors.has(executor.type)) {
    console.warn(`Executor for type "${executor.type}" is being overwritten`);
  }
  executors.set(executor.type, executor);
}

/**
 * Get an executor for a node type.
 * @param type - The node type
 * @returns The executor, or undefined if not found
 */
export function getExecutor(type: string): NodeExecutor | undefined {
  return executors.get(type);
}

/**
 * Check if an executor is registered for a node type.
 * @param type - The node type
 * @returns True if an executor is registered
 */
export function hasExecutor(type: string): boolean {
  return executors.has(type);
}

/**
 * Get all registered node types.
 * @returns Array of registered node type strings
 */
export function getRegisteredTypes(): string[] {
  return Array.from(executors.keys());
}

/**
 * Check if a node type has a pulse output.
 * @param type - The node type
 * @returns True if the node type has a pulse output
 */
export function hasPulseOutput(type: string): boolean {
  const executor = executors.get(type);
  return executor?.hasPulseOutput ?? false;
}

/**
 * Check if downstream output nodes should be tracked for a node type.
 * @param type - The node type
 * @returns True if downstream outputs should be marked as running
 */
export function shouldTrackDownstream(type: string): boolean {
  const executor = executors.get(type);
  return executor?.shouldTrackDownstream ?? false;
}

/**
 * Clear all registered executors (useful for testing).
 */
export function clearExecutors(): void {
  executors.clear();
}
