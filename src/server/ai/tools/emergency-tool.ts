import { tool } from "ai";
import { z } from "zod";

export function createEmergencyGuidanceTool(execute: () => Promise<unknown>) {
  return tool({
    description: "Check the application's fixed demo rules for reported chest-pain warning signs. Call when chest pain is discussed; this is not a clinical assessment.",
    inputSchema: z.object({}),
    execute,
  });
}