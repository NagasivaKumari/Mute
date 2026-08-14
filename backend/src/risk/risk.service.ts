import { Injectable } from '@nestjs/common';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  reason: string;
}

const HIGH_PATTERNS = [
  /^DELETE_/,
  /^DROP_/,
  /^DESTROY_/,
  /^DEPLOY/,
  /^RESOLVE_SECRET/,
  /^READ_SECRET/,
  /^EXEC_/,
  /^CREATE_DATABASE/,
  /^MODIFY_/,
  /^RESTART_/,
];
const MEDIUM_PATTERNS = [
  /^WRITE_/,
  /^GIT_PUSH/,
  /^CREATE_/,
  /^NETWORK_/,
  /^INSTALL_/,
];

@Injectable()
export class RiskService {
  classify(action: string): RiskAssessment {
    const name = action.toUpperCase();

    if (HIGH_PATTERNS.some((p) => p.test(name))) {
      return { level: 'high', score: 80, reason: `${action} is a high-risk operation` };
    }
    if (MEDIUM_PATTERNS.some((p) => p.test(name))) {
      return { level: 'medium', score: 50, reason: `${action} modifies state and needs review` };
    }
    return { level: 'low', score: 20, reason: `${action} is a low-risk operation` };
  }
}
