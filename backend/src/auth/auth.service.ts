import { Injectable, forwardRef, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../schemas/user.schema';
import { Organization, OrganizationDocument } from '../schemas/organization.schema';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { PoliciesService } from '../policies/policies.service';
import { slugify } from '@sentinel/shared';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';
import { toApiId, toApiDate } from '../common/utils/mapper.util';
import { FlareService } from '../flare/flare.service';
import { ethers } from 'ethers';

const BCRYPT_ROUNDS = 12;
const WALLET_CHALLENGE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => FlareService))
    private readonly flareService: FlareService,
    @Inject(forwardRef(() => PoliciesService))
    private readonly policiesService: PoliciesService,
  ) {}

  async register(dto: RegisterDto) {
    const slug = slugify(dto.organizationName);
    const existingOrg = await this.orgModel.findOne({ slug }).exec();
    if (existingOrg) {
      apiError(400, ErrorCode.VALIDATION_ERROR, 'Organization name already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const vaultNonce = crypto.randomBytes(32).toString('hex');
    const org = await this.orgModel.create({
      name: dto.organizationName,
      slug,
      plan: 'free',
      status: 'active',
      ownerId: null,
      vaultNonce,
    });

    const user = await this.userModel.create({
      organizationId: org._id,
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'owner',
      status: 'active',
    });

    org.ownerId = user._id;
    await org.save();

    // ponytail: anchor org creation on OrganizationRegistry (fire-and-forget)
    this.flareService
      .anchorOrganization(org._id.toString(), org.name)
      .then((txHash) => {
        if (txHash) {
          org.flareOrgId = txHash;
          return org.save();
        }
      })
      .catch(() => undefined);

    // seed system policies for the new org
    this.policiesService.seedSystemPolicies(org._id.toString(), user._id.toString())
      .catch((err) => this.logger.error('Failed to seed system policies', err));

    const tokens = await this.generateTokens(user);
    const refreshHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    user.refreshTokenHash = refreshHash;
    await user.save();

    return {
      ...tokens,
      user: this.mapUser(user),
      organization: this.mapOrg(org),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase() })
      .exec();
    if (!user) {
      apiError(401, ErrorCode.AUTH_FAILED, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      apiError(401, ErrorCode.AUTH_FAILED, 'Invalid credentials');
    }

    user.lastLogin = new Date();
    const tokens = await this.generateTokens(user);
    user.refreshTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await user.save();

    const org = await this.orgModel.findById(user.organizationId).exec();
    return {
      ...tokens,
      user: this.mapUser(user),
      organization: org ? this.mapOrg(org) : null,
    };
  }

  async walletChallenge(address: string) {
    if (!ethers.isAddress(address)) {
      apiError(400, ErrorCode.VALIDATION_ERROR, 'Invalid wallet address');
    }
    const org = await this.orgModel
      .findOne({
        walletAddress: ethers.getAddress(address),
        walletConnected: true,
        walletVerified: true,
        walletRevokedAt: { $exists: false },
      })
      .exec();
    if (!org) {
      apiError(404, ErrorCode.NOT_FOUND, 'Wallet not linked and verified to any organization');
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    org.walletChallengeNonce = nonce;
    org.walletChallengeExpiresAt = new Date(Date.now() + WALLET_CHALLENGE_TTL_MS);
    await org.save();

    return { message: `sentinel:login:${org._id.toString()}:${nonce}` };
  }

  async walletLogin(address: string, signature: string) {
    if (!ethers.isAddress(address)) {
      apiError(400, ErrorCode.VALIDATION_ERROR, 'Invalid wallet address');
    }
    const org = await this.orgModel
      .findOne({
        walletAddress: ethers.getAddress(address),
        walletConnected: true,
        walletVerified: true,
        walletRevokedAt: { $exists: false },
      })
      .exec();
    if (!org) {
      apiError(401, ErrorCode.AUTH_FAILED, 'Wallet not linked and verified to any organization');
    }
    if (!org.walletChallengeNonce || !org.walletChallengeExpiresAt) {
      apiError(401, ErrorCode.AUTH_FAILED, 'No active challenge — reconnect the wallet');
    }

    const message = `sentinel:login:${org._id.toString()}:${org.walletChallengeNonce}`;
    let recovered: string;
    try {
      recovered = ethers.verifyMessage(message, signature);
    } catch {
      apiError(401, ErrorCode.AUTH_FAILED, 'Invalid signature');
    }
    if (ethers.getAddress(recovered) !== ethers.getAddress(org.walletAddress!)) {
      apiError(401, ErrorCode.AUTH_FAILED, 'Invalid signature');
    }

    // one-time challenge: atomic consume so a captured signature cannot be replayed
    const consumed = await this.orgModel
      .findOneAndUpdate(
        {
          _id: org._id,
          walletChallengeNonce: org.walletChallengeNonce,
          walletChallengeExpiresAt: { $gt: new Date() },
        },
        { $unset: { walletChallengeNonce: '', walletChallengeExpiresAt: '' } },
      )
      .exec();
    if (!consumed) {
      apiError(401, ErrorCode.AUTH_FAILED, 'Challenge expired or already used — reconnect the wallet');
    }

    const user = await this.userModel
      .findOne({ organizationId: org._id, role: 'owner' })
      .exec();
    if (!user) apiError(401, ErrorCode.AUTH_FAILED, 'Organization owner not found');
    if (user.status !== 'active') apiError(403, ErrorCode.AUTH_FAILED, 'Account is disabled');

    user.lastLogin = new Date();
    const tokens = await this.generateTokens(user);
    user.refreshTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await user.save();

    return {
      ...tokens,
      user: this.mapUser(user),
      organization: this.mapOrg(org),
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      }) as { sub: string };
    } catch {
      apiError(401, ErrorCode.AUTH_FAILED, 'Invalid refresh token');
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const user = await this.userModel.findOne({ _id: payload.sub, refreshTokenHash: { $ne: null } }).exec();
    if (!user) apiError(401, ErrorCode.AUTH_FAILED, 'Invalid refresh token');

    const tokens = await this.generateTokens(user);
    const newHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');

    const updated = await this.userModel.findOneAndUpdate(
      { _id: payload.sub, refreshTokenHash: tokenHash },
      { refreshTokenHash: newHash },
    ).exec();

    if (!updated) {
      await this.userModel.findByIdAndUpdate(payload.sub, { refreshTokenHash: null }).exec();
      apiError(401, ErrorCode.AUTH_FAILED, 'Refresh token already used');
    }

    return tokens;
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash: null });
    return { loggedOut: true };
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      apiError(404, ErrorCode.NOT_FOUND, 'User not found');
    }
    const org = await this.orgModel.findById(user.organizationId).exec();
    return {
      user: this.mapUser(user),
      organization: org ? this.mapOrg(org) : null,
    };
  }

  private async generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      orgId: user.organizationId.toString(),
      email: user.email,
      role: user.role,
    };

    const expiresIn = this.configService.get<string>('jwt.expiresIn') ?? '15m';
    const refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';

    const accessToken = this.jwtService.sign(payload, { expiresIn });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  private mapUser(user: UserDocument) {
    return {
      id: toApiId(user),
      organizationId: user.organizationId.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      lastLogin: toApiDate(user.lastLogin),
      createdAt: toApiDate(user.createdAt)!,
      updatedAt: toApiDate(user.updatedAt)!,
    };
  }

  private mapOrg(org: OrganizationDocument) {
    return {
      id: toApiId(org),
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      status: org.status,
      ownerId: org.ownerId!.toString(),
      flareOrgId: org.flareOrgId,
      walletAddress: org.walletAddress,
      walletConnected: Boolean(org.walletConnected),
      walletVerified: Boolean(org.walletVerified),
      walletNetwork: org.walletNetwork,
      walletConnectedAt: org.walletConnectedAt?.toISOString() ?? null,
      walletLastVerified: org.walletLastVerified?.toISOString() ?? null,
      createdAt: toApiDate(org.createdAt)!,
      updatedAt: toApiDate(org.updatedAt)!,
    };
  }
}
