export class IncomingMessageDto {
  type: string = 'incoming_message';
  message_id: string;
  sender_id: string;
  content: string;
  timestamp: number;

  constructor(
    messageId: string,
    senderId: string,
    content: string,
    timestamp: number,
  ) {
    this.message_id = messageId;
    this.sender_id = senderId;
    this.content = content;
    this.timestamp = timestamp;
  }
}
