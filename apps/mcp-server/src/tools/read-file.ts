import * as fs from 'node:fs';
import type { SentinelConfig, DetectionResult } from '@sentinel/shared';
import { SecretDetector } from '@sentinel/shared';
import { sendAuditEvent } from '../audit.js';
import type { ToolDefinition } from './types.js';

export const readFileTool: ToolDefinition = {
  name: 'read_file',
  description: 'Read a file from disk with secret masking. Detected secrets are replaced before returning.',
  schema: {
    path: { type: 'string', description: 'Absolute path to the file to read' },
  },
  handler: async (args: Record<string, unknown>, config: SentinelConfig) => {
    const filePath = args.path as string;

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: Cannot read file "${filePath}": ${(err as Error).message}` }],
        isError: true,
      };
    }

    const result: DetectionResult = SecretDetector.maskContent(content);

    await sendAuditEvent(config, {
      action: 'FILE_READ',
      resource: filePath,
      decision: 'SANITIZED_RETURN',
      details: `Detected secrets: ${result.detected.join(', ') || 'none'}`,
    });

    const response = [
      `File: ${filePath}`,
      `Secrets detected and masked: ${result.detected.length > 0 ? result.detected.join(', ') : 'none'}`,
      '',
      '--- Content ---',
      result.masked,
    ].join('\n');

    return {
      content: [{ type: 'text' as const, text: response }],
    };
  },
};
