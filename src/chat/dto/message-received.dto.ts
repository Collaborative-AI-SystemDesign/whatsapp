export class MessageReceivedDto {
  action: string = 'message_received';
  message_id: string;
  message_id_by_client?: number;
  timestamp: number;

  constructor(messageId: string, messageIdByClient?: number) {
    this.message_id = messageId;
    this.message_id_by_client = messageIdByClient;
    this.timestamp = Date.now();
  }
}
