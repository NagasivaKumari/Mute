import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FlareController } from './flare.controller';
import { FlareService } from './flare.service';
import {
  PendingAnchor,
  PendingAnchorSchema,
} from '../schemas/pending-anchor.schema';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PendingAnchor.name, schema: PendingAnchorSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [FlareController],
  providers: [FlareService],
  exports: [FlareService],
})
export class FlareModule {}
