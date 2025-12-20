/**
 * Test fixtures for validator testing.
 * Returns intentionally bad JSON to test the evaluation flow.
 * Dev-only - used when "Test" toggle is enabled in Autopilot sidebar.
 */

import type { FlowChanges } from "./types";

/**
 * Bad JSON fixtures covering different error types.
 * Each fixture has a description and the bad JSON that should trigger validation errors.
 */
const BAD_JSON_FIXTURES: Array<{
  name: string;
  description: string;
  json: FlowChanges;
}> = [
  {
    name: "invalidModel",
    description: "Uses gpt-4o which doesn't exist in valid models",
    json: {
      actions: [
        {
          type: "addNode",
          node: {
            id: "test-node-1",
            type: "text-generation",
            position: { x: 400, y: 100 },
            data: {
              label: "Bad Model Node",
              provider: "openai",
              model: "gpt-4o", // Invalid - should be gpt-5.2, gpt-5-mini, or gpt-5-nano
            },
          },
        },
        {
          type: "addEdge",
          edge: {
            id: "test-edge-1",
            source: "input-1",
            target: "test-node-1",
            targetHandle: "prompt",
            data: { dataType: "string" },
          },
        },
      ],
      explanation: "Added a text generation node with an invalid model ID",
    },
  },
  {
    name: "invalidDataType",
    description: "Uses 'audio' dataType which isn't valid",
    json: {
      actions: [
        {
          type: "addNode",
          node: {
            id: "test-node-1",
            type: "text-generation",
            position: { x: 400, y: 100 },
            data: {
              label: "Audio Processor",
              provider: "google",
              model: "gemini-3-flash-preview",
            },
          },
        },
        {
          type: "addEdge",
          edge: {
            id: "test-edge-1",
            source: "input-1",
            target: "test-node-1",
            targetHandle: "prompt",
            data: { dataType: "audio" as unknown as "string" }, // Invalid dataType
          },
        },
      ],
      explanation: "Connected with an invalid audio dataType",
    },
  },
  {
    name: "nonExistentNodeRemoval",
    description: "Tries to remove a node that doesn't exist",
    json: {
      actions: [
        {
          type: "removeNode",
          nodeId: "nonexistent-node-12345", // Doesn't exist
        },
        {
          type: "addNode",
          node: {
            id: "test-node-1",
            type: "text-generation",
            position: { x: 400, y: 100 },
            data: {
              label: "New Node",
              provider: "google",
              model: "gemini-3-flash-preview",
            },
          },
        },
      ],
      explanation: "Tried to remove a non-existent node",
    },
  },
  {
    name: "invalidTargetHandle",
    description: "Uses an invalid targetHandle for text-generation",
    json: {
      actions: [
        {
          type: "addNode",
          node: {
            id: "test-node-1",
            type: "text-generation",
            position: { x: 400, y: 100 },
            data: {
              label: "Text Generator",
              provider: "anthropic",
              model: "claude-sonnet-4-5",
            },
          },
        },
        {
          type: "addEdge",
          edge: {
            id: "test-edge-1",
            source: "input-1",
            target: "test-node-1",
            targetHandle: "audio-input", // Invalid handle
            data: { dataType: "string" },
          },
        },
      ],
      explanation: "Connected to an invalid handle",
    },
  },
  {
    name: "imageToTextPrompt",
    description: "Connects image data to a text prompt handle",
    json: {
      actions: [
        {
          type: "addNode",
          node: {
            id: "test-img-gen",
            type: "image-generation",
            position: { x: 400, y: 100 },
            data: {
              label: "Image Generator",
              provider: "google",
              model: "gemini-2.5-flash-image",
            },
          },
        },
        {
          type: "addNode",
          node: {
            id: "test-text-gen",
            type: "text-generation",
            position: { x: 750, y: 100 },
            data: {
              label: "Text Analyzer",
              provider: "google",
              model: "gemini-3-flash-preview",
            },
          },
        },
        {
          type: "addEdge",
          edge: {
            id: "test-edge-1",
            source: "input-1",
            target: "test-img-gen",
            targetHandle: "prompt",
            data: { dataType: "string" },
          },
        },
        {
          type: "addEdge",
          edge: {
            id: "test-edge-2",
            source: "test-img-gen",
            target: "test-text-gen",
            targetHandle: "prompt", // Wrong! Image can't go to prompt
            data: { dataType: "image" },
          },
        },
      ],
      explanation: "Incorrectly connected image output to text prompt",
    },
  },
  {
    name: "multipleErrors",
    description: "Contains multiple validation errors at once",
    json: {
      actions: [
        {
          type: "removeNode",
          nodeId: "ghost-node", // Doesn't exist
        },
        {
          type: "addNode",
          node: {
            id: "test-node-1",
            type: "text-generation",
            position: { x: 400, y: 100 },
            data: {
              label: "Bad Everything",
              provider: "openai",
              model: "gpt-4-turbo", // Invalid model
            },
          },
        },
        {
          type: "addEdge",
          edge: {
            id: "test-edge-1",
            source: "input-1",
            target: "test-node-1",
            targetHandle: "prompt",
            data: { dataType: "video" as unknown as "string" }, // Invalid dataType
          },
        },
      ],
      explanation: "Multiple validation errors in one response",
    },
  },
];

/**
 * Get a random bad JSON fixture for testing.
 */
export function getRandomBadJson(): FlowChanges {
  const index = Math.floor(Math.random() * BAD_JSON_FIXTURES.length);
  return BAD_JSON_FIXTURES[index].json;
}

/**
 * Get all available fixtures for debugging/inspection.
 */
export function getAllFixtures() {
  return BAD_JSON_FIXTURES;
}
