export class IncomingMessageDto {
  type: 'incoming_message';
  message_id: string;
  sender_id: string;
  content: string;
  timestamp: number;
}
