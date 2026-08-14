import { Types } from 'mongoose';

export function toApiId(doc: { _id: Types.ObjectId | string }): string {
  return doc._id.toString();
}

export function toApiDate(date?: Date | null): string | undefined {
  return date ? date.toISOString() : undefined;
}
