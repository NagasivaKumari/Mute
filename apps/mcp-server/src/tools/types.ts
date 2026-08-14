import type { SentinelConfig } from '@sentinel/shared';
import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, { type: string; description: string }>;
  handler: (args: Record<string, unknown>, config: SentinelConfig) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }>;
}

export function toZodSchema(schema: ToolDefinition['schema']): Record<string, z.ZodString> {
  return Object.fromEntries(
    Object.entries(schema).map(([key, field]) => [key, z.string().describe(field.description)]),
  );
}
