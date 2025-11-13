import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class MessageDeliveredDto {
  @IsString()
  @IsNotEmpty()
  message_id: string;

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;
}
