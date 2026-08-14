import { Controller, Get, Param } from '@nestjs/common';
import { FlareService } from './flare.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('flare')
export class FlareController {
  constructor(private readonly flareService: FlareService) {}

  @Public()
  @Get('status')
  status() {
    const data = this.flareService.getStatus();
    return { success: true, data };
  }

  @Get('verify/:hash')
  verify(@Param('hash') hash: string) {
    return this.flareService.verifyHash(hash).then((data) => ({
      success: true,
      data,
    }));
  }
}
