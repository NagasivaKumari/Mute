import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PendingAnchorDocument = HydratedDocument<PendingAnchor>;

@Schema({ collection: 'pending_anchors' })
export class PendingAnchor {
  @Prop({ required: true })
  hash!: string;

  @Prop({ required: true })
  anchorType!: string;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop()
  lastError?: string;

  @Prop({ default: Date.now })
  createdAt!: Date;
}

export const PendingAnchorSchema = SchemaFactory.createForClass(PendingAnchor);
