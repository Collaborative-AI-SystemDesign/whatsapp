import { Controller, Get, Param, Query } from '@nestjs/common';
import { MessagesService } from '../services/messages.service';
import { MessageDocument } from '../schemas/message.schema';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * 채팅 히스토리 조회
   * GET /messages/history/:chatParticipantId?userId=...&lastTimestamp=...&limit=50
   */
  @Get('history/:chatParticipantId')
  async getChatHistory(
    @Param('chatParticipantId') chatParticipantId: string,
    @Query('userId') userId: string, // 임시: 나중에 JWT에서 추출
    @Query('lastTimestamp') lastTimestamp?: string,
    @Query('limit') limit?: string,
  ): Promise<MessageDocument[]> {
    const timestamp = lastTimestamp ? new Date(lastTimestamp) : undefined;
    const limitNumber = limit ? parseInt(limit, 10) : 50;

    return this.messagesService.getChatHistory(
      userId,
      chatParticipantId,
      timestamp,
      limitNumber,
    );
  }

  /**
   * 특정 메시지 조회
   * GET /messages/:messageId
   * @throws NotFoundException 메시지를 찾을 수 없는 경우
   */
  @Get(':messageId')
  async getMessage(
    @Param('messageId') messageId: string,
  ): Promise<MessageDocument> {
    return this.messagesService.findByMessageId(messageId);
  }
}
