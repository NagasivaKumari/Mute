import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import { SecretDetector } from '@sentinel/shared';
import { AuditService, CreateAuditDto } from '../audit/audit.service';

export interface MaskFileOptions {
  organizationId?: string;
  projectId?: string;
  agentId?: string;
  sessionId?: string;
  agentName?: string;
}

@Injectable()
export class SecretMaskingService {
  private readonly logger = new Logger(SecretMaskingService.name);

  constructor(private readonly auditService: AuditService) {}

  async maskFile(
    filePath: string,
    audit?: MaskFileOptions,
  ): Promise<{
    secretsFound: number;
    secretsMasked: number;
    sanitizedContent: string;
    maskedKeys: string[];
  }> {
    this.logger.log(`Reading file: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');

    const result = SecretDetector.maskContent(content);
    const maskedKeys = result.detected;
    const secretsFound = result.found;
    const secretsMasked = result.maskedCount;
    const sanitizedContent = result.masked;
    const secretsExposed = secretsFound - secretsMasked;

    maskedKeys.forEach((key) => this.logger.log(`Secret masked: ${key}`));
    if (secretsFound - secretsMasked > 0) {
      this.logger.warn(`${secretsExposed} secret(s) already masked in ${filePath}`);
    }
    this.logger.log(`Summary: ${secretsFound} found, ${secretsMasked} masked in ${filePath}`);

    if (audit) {
      const dto: CreateAuditDto = {
        organizationId: audit.organizationId,
        projectId: audit.projectId,
        agentId: audit.agentId,
        sessionId: audit.sessionId,
        action: 'FILE_READ',
        resource: filePath,
        decision: 'SANITIZED_RETURN',
        event: 'FILE_READ',
        secretsFound,
        secretsMasked,
        secretsExposed,
        agentName: audit.agentName,
      };
      await this.auditService.create(dto).catch((err) => {
        this.logger.error(`Failed to create audit event: ${err.message}`);
      });
    }

    return {
      secretsFound,
      secretsMasked,
      sanitizedContent,
      maskedKeys,
    };
  }
}
