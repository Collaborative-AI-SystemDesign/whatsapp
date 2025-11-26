import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, SortOrder } from 'mongoose';
import { Message, MessageDocument } from '../schemas/message.schema';
import { v4 as uuidv4 } from 'uuid';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/enums/error-code.enum';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
  ) {}

  /**
   * 새로운 메시지 생성
   */
  async createMessage(
    senderId: string,
    receiverId: string,
    content: string,
    timestamp: Date,
  ): Promise<MessageDocument> {
    const messageId = this.generateMessageId();

    const message = await this.messageModel.create({
      messageId,
      senderId,
      receiverId,
      content,
      timestamp,
      undelivered: true,
    });

    return message;
  }

  /**
   * 메시지 ID로 조회
   */
  async findByMessageId(messageId: string): Promise<MessageDocument> {
    const result = await this.messageModel.findOne({ messageId }).exec();

    if (!result) {
      throw new AppException(ErrorCode.MESSAGE_NOT_FOUND, { messageId });
    }

    return result;
  }

  /**
   * 미전달 메시지 조회 (특정 수신자)
   */
  async findUndeliveredMessages(
    receiverId: string,
  ): Promise<MessageDocument[]> {
    const filter: FilterQuery<Message> = { receiverId, undelivered: true };
    const sort: Record<string, SortOrder> = { timestamp: 1 };

    const messages = await this.messageModel.find(filter).sort(sort).exec();
    return messages as MessageDocument[];
  }

  /**
   * 메시지 전달 완료 표시
   */
  async markAsDelivered(messageId: string): Promise<void> {
    await this.messageModel
      .updateOne({ messageId }, { undelivered: false, deliveredAt: new Date() })
      .exec();
  }

  /**
   * 메시지를 미전달 상태로 되돌림 (보상 트랜잭션용)
   */
  async markAsUndelivered(messageId: string): Promise<void> {
    await this.messageModel
      .updateOne(
        { messageId },
        { $unset: { deliveredAt: '' }, undelivered: true },
      )
      .exec();
  }

  /**
   * 메시지 읽음 표시
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.messageModel
      .updateOne({ messageId }, { readAt: new Date() })
      .exec();
  }

  /**
   * 채팅 히스토리 조회 (페이지네이션)
   */
  async getChatHistory(
    userId: string,
    chatParticipantId: string,
    lastTimestamp?: Date,
    limit: number = 50,
  ): Promise<MessageDocument[]> {
    const query: FilterQuery<Message> = {
      $or: [
        { senderId: userId, receiverId: chatParticipantId },
        { senderId: chatParticipantId, receiverId: userId },
      ],
    };

    if (lastTimestamp !== undefined) {
      query.timestamp = { $lt: lastTimestamp };
    }

    return await this.messageModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * 오래된 전달 완료 메시지 삭제 (유저 설정에 따라)
   */
  async deleteOldMessages(days: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    await this.messageModel
      .deleteMany({
        undelivered: false,
        deliveredAt: { $lt: cutoffDate },
      })
      .exec();
  }

  /**
   * 메시지 ID로 메시지 삭제 (보상 트랜잭션용)
   */
  async deleteByMessageId(messageId: string): Promise<void> {
    await this.messageModel.deleteOne({ messageId }).exec();
  }

  /**
   * 고유한 메시지 ID 생성
   */
  private generateMessageId(): string {
    return uuidv4();
  }
}
