import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ timestamps: true, collection: 'projects' })
export class Project {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  slug!: string;

  @Prop()
  repositoryUrl?: string;

  @Prop()
  defaultBranch?: string;

  @Prop({
    enum: ['cursor', 'claude', 'copilot', 'cli', 'custom'],
    default: 'custom',
  })
  runtimeType!: string;

  @Prop({ enum: ['development', 'staging', 'production'], default: 'development' })
  environment!: string;

  @Prop({ enum: ['active', 'archived'], default: 'active' })
  status!: string;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ organizationId: 1, slug: 1 }, { unique: true });
