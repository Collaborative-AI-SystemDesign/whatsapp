import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, unique: true, index: true })
  messageId: string;

  @Prop({ required: true, index: true })
  senderId: string;

  @Prop({ required: true, index: true })
  receiverId: string;

  @Prop({ required: true, maxlength: 1000 })
  content: string;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop({ default: true, index: true })
  undelivered: boolean;

  @Prop({ default: null })
  deliveredAt?: Date;

  @Prop({ default: null })
  readAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// 복합 인덱스 추가
MessageSchema.index({ receiverId: 1, timestamp: -1 });
MessageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });
MessageSchema.index({ undelivered: 1, receiverId: 1 });
