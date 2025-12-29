/**
 * Switch Node Executor
 *
 * Implements Origami-style switch patch with three pulse inputs:
 * - flip: Toggles the state (on→off or off→on)
 * - turnOn: Sets state to on (no effect if already on)
 * - turnOff: Sets state to off (no effect if already off)
 *
 * Outputs boolean "true" or "false" based on current state.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

interface PulseData {
  fired: boolean;
  timestamp: number;
}

/**
 * Check if a pulse input was fired
 */
function isPulseFired(input: string | undefined): boolean {
  if (!input) return false;
  try {
    const pulse: PulseData = JSON.parse(input);
    return pulse.fired === true;
  } catch {
    return false;
  }
}

export const switchExecutor: NodeExecutor = {
  type: "switch",
  // Switch outputs boolean, not pulse
  hasPulseOutput: false,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, inputs } = ctx;

    // Get current state from node data (default to false/off)
    let isOn = (node.data.isOn as boolean) ?? false;

    // Check pulse inputs
    const flipFired = isPulseFired(inputs["flip"]);
    const turnOnFired = isPulseFired(inputs["turnOn"]);
    const turnOffFired = isPulseFired(inputs["turnOff"]);

    // Process pulses in priority order: turnOff > turnOn > flip
    // This ensures explicit on/off takes precedence over toggle
    if (turnOffFired) {
      isOn = false;
    } else if (turnOnFired) {
      isOn = true;
    } else if (flipFired) {
      isOn = !isOn;
    }

    // Return new state as boolean string output
    // Also return switchState so it can be persisted to node.data.isOn
    return {
      output: isOn ? "true" : "false",
      switchState: isOn,
    };
  },
};
