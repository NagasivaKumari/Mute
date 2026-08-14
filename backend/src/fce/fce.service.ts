import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import type { AttestationPayload, DangerousAuthPayload } from '@sentinel/types';
import SentinelInstructionSenderAbi from './SentinelInstructionSender.abi.json';

@Injectable()
export class FceService {
  private readonly logger = new Logger(FceService.name);
  private readonly proxyUrl: string;
  private readonly pollInterval: number;
  private readonly pollTimeout: number;
  private readonly txValue: bigint;
  private readonly senderContract?: ethers.Contract;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.proxyUrl = configService.get<string>('fce.url', 'http://localhost:6674');
    this.pollInterval = configService.get<number>('fce.pollInterval', 2000);
    this.pollTimeout = configService.get<number>('fce.pollTimeout', 60000);
    this.txValue = BigInt(configService.get<number>('fce.txValue', 1));

    const contractAddress = configService.get<string>('fce.senderContractAddress');
    if (contractAddress) {
      const privateKey = configService.get<string>('flare.privateKey');
      const rpcUrl = configService.get<string>('flare.rpcUrl');
      if (privateKey && rpcUrl) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        this.senderContract = new ethers.Contract(
          contractAddress,
          SentinelInstructionSenderAbi as ethers.InterfaceAbi,
          wallet,
        );
        this.logger.log(`FCE on-chain sender initialized at ${contractAddress}`);
      } else {
        this.logger.warn('FCE sender contract configured but missing flare credentials');
      }
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized || !this.senderContract) return;
    try {
      const tx = await this.senderContract.setExtensionId();
      await tx.wait();
      this.logger.log('Extension ID initialized via setExtensionId()');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already set')) {
        this.logger.warn('setExtensionId() — extension ID already set');
      } else {
        throw err;
      }
    }
    this.initialized = true;
  }

  private async sendAndPoll(method: string, payload: object): Promise<any> {
    if (!this.senderContract) {
      throw new Error('FCE sender contract not initialized');
    }

    await this.ensureInitialized();

    const dataHex = ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(payload)));
    const tx = await this.senderContract[method](dataHex, { value: this.txValue });
    const receipt = await tx.wait();

    const contractAddress = (this.senderContract.target as string).toLowerCase();
    const iface = new ethers.Interface(SentinelInstructionSenderAbi as ethers.InterfaceAbi);
    let instructionId: string | null = null;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contractAddress) continue;
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === 'InstructionDispatched') {
          instructionId = parsed.args.instructionId;
          break;
        }
      } catch { }
    }

    if (!instructionId) {
      throw new Error('InstructionDispatched event not found in transaction receipt');
    }

    const start = Date.now();
    while (Date.now() - start < this.pollTimeout) {
      const response = await fetch(`${this.proxyUrl}/action-result/${instructionId}`);
      if (response.ok) {
        const result = await response.json();
        if (result && result.status === 1 && result.data) {
          const dataJson = ethers.toUtf8String(result.data);
          return JSON.parse(dataJson);
        }
      }
      await new Promise(r => setTimeout(r, this.pollInterval));
    }

    throw new Error(`Timeout polling for instruction result: ${instructionId}`);
  }

  async authorizeSecret(
    orgId: string,
    secretName: string,
    context: { agentId: string; sessionId: string },
  ): Promise<{
    authorized: boolean;
    authorizationId: number;
    timestamp: number;
    operation: string;
    orgId: string;
    secretName: string;
    instructionId: string;
    signature: string;
    publicKey: string;
  }> {
    const payload = { orgId, secretName, context: { ...context, action: 'RESOLVE_SECRET' } };
    return this.sendAndPoll('authorizeSecret', payload);
  }

  async attestPolicy(
    orgId: string,
    policyId: string,
    policyHash: string,
    version: number,
  ): Promise<AttestationPayload> {
    const hash = policyHash.startsWith('0x') ? policyHash : '0x' + policyHash;
    const payload = { orgId, policyId, policyHash: hash, version };
    return this.sendAndPoll('attestPolicy', payload);
  }

  async authorizeDangerousOperation(
    orgId: string,
    operationId: string,
    operationType: string,
    resource: string,
    requestHash: string,
  ): Promise<DangerousAuthPayload> {
    const payload = { orgId, operationId, operationType, resource, requestHash };
    return this.sendAndPoll('authorizeDangerous', payload);
  }
}
