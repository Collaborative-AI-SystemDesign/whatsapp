export interface MessagePayload {
  messageId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  messageIdByClient?: number;
}

export interface IQueueService {
  /**
   * 메시지를 큐에 발행
   */
  publishMessage(payload: MessagePayload): Promise<void>;

  /**
   * 큐에서 메시지 소비
   */
  consume(callback: (message: MessagePayload) => Promise<void>): Promise<void>;

  /**
   * 큐 이름 반환
   */
  getQueueName(): string;
}
