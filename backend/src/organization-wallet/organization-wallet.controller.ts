import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { OrganizationWalletService } from './organization-wallet.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

class ConnectWalletDto {
  @IsString()
  address!: string;
}

class VerifyWalletDto {
  @IsString()
  signature!: string;
}

@Controller('organization/wallet')
@UseGuards(JwtAuthGuard)
export class OrganizationWalletController {
  constructor(private readonly walletService: OrganizationWalletService) {}

  @Get()
  async get(@CurrentUser() user: AuthUser) {
    const data = await this.walletService.get(user.organizationId);
    return { success: true, data };
  }

  @Post('connect')
  async connect(@CurrentUser() user: AuthUser, @Body() dto: ConnectWalletDto) {
    const data = await this.walletService.connect(user.organizationId, dto.address, user);
    return { success: true, data, message: 'Wallet registered — sign the challenge to verify' };
  }

  @Post('verify')
  async verify(@CurrentUser() user: AuthUser, @Body() dto: VerifyWalletDto) {
    const data = await this.walletService.verify(user.organizationId, dto.signature, user);
    return { success: true, data, message: 'Wallet verified as organization blockchain identity' };
  }

  @Post('disconnect')
  async disconnect(@CurrentUser() user: AuthUser) {
    const data = await this.walletService.disconnect(user.organizationId, user);
    return { success: true, data, message: 'Wallet disconnected — new Flare attestations paused' };
  }
}
