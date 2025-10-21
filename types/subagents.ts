/**
 * Subagent Definition Types
 * Based on Claude Agent SDK: https://docs.claude.com/en/api/agent-sdk/subagents
 */

export interface SubagentDefinition {
  /**
   * Description of when to invoke this subagent.
   * CRITICAL: This determines automatic subagent selection.
   * Be specific about trigger conditions and use cases.
   */
  description: string;

  /**
   * System prompt defining the subagent's role, expertise, and behavior.
   * Should be focused and specialized for the subagent's domain.
   */
  prompt: string;

  /**
   * Optional: Restrict to specific tools (default: inherits all tools from main agent)
   * Security best practice: Only grant tools necessary for the subagent's role
   */
  tools?: string[];

  /**
   * Optional: Override model (default: inherits model from main agent)
   * Use different models for different specializations (e.g., opus for complex research)
   */
  model?: string;
}

/**
 * Registry of all subagents
 * Key: Subagent name (lowercase with hyphens)
 * Value: SubagentDefinition
 */
export interface SubagentRegistry {
  [key: string]: SubagentDefinition;
}
