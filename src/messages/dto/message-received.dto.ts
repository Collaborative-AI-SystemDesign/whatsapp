export class MessageReceivedDto {
  action: 'message_received';
  message_id: string;
  message_id_by_client: number;
  timestamp: number;
}
