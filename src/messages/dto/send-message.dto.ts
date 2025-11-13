import { IsString, IsNumber, MaxLength, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  receiver_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @IsNumber()
  @IsNotEmpty()
  message_id_by_client: number;

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;
}
