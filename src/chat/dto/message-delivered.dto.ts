import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class MessageDeliveredDto {
  @IsString()
  @IsNotEmpty()
  message_id: string;

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;
}
