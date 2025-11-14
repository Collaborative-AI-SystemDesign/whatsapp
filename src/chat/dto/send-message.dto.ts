import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  receiver_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Message content cannot exceed 1000 characters' })
  content: string;

  @IsNumber()
  @IsOptional()
  message_id_by_client?: number;

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;
}
