import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { Approval, ApprovalSchema } from '../schemas/approval.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { FlareModule } from '../flare/flare.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Approval.name, schema: ApprovalSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => FlareModule),
    forwardRef(() => WebSocketModule),
    RiskModule,
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
