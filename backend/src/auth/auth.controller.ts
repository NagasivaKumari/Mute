import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, WalletChallengeDto, WalletLoginDto } from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return { success: true, data, message: 'Registration successful' };
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return { success: true, data, message: 'Login successful' };
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    const data = await this.authService.refresh(dto.refreshToken);
    return { success: true, data };
  }

  @Public()
  @Post('wallet/challenge')
  async walletChallenge(@Body() dto: WalletChallengeDto) {
    const data = await this.authService.walletChallenge(dto.address);
    return { success: true, data, message: 'Wallet challenge issued' };
  }

  @Public()
  @Post('wallet/login')
  async walletLogin(@Body() dto: WalletLoginDto) {
    const data = await this.authService.walletLogin(dto.address, dto.signature);
    return { success: true, data, message: 'Wallet login successful' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(@CurrentUser() user: AuthUser) {
    const data = await this.authService.getProfile(user.userId);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: AuthUser) {
    const data = await this.authService.logout(user.userId);
    return { success: true, data };
  }
}
