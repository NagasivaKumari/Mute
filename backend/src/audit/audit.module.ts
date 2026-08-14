import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';
import { FlareModule } from '../flare/flare.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
    forwardRef(() => FlareModule),
    forwardRef(() => WebSocketModule),
    RiskModule,
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
