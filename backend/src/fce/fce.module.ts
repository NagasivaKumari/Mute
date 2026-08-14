import { Module } from '@nestjs/common';
import { FceService } from './fce.service';

@Module({
  providers: [FceService],
  exports: [FceService],
})
export class FceModule {}
