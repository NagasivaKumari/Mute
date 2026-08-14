import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DemoController],
})
export class DemoModule {}
