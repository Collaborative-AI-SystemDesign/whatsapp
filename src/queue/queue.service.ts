import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/enums/error-code.enum';
import {
  IQueueService,
  MessagePayload,
} from '../common/interfaces/queue.interface';

/**
 * Type guard to validate MessagePayload
 */
function isMessagePayload(obj: unknown): obj is MessagePayload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'messageId' in obj &&
    'senderId' in obj &&
    'receiverId' in obj &&
    'content' in obj &&
    'timestamp' in obj &&
    typeof (obj as MessagePayload).messageId === 'string' &&
    typeof (obj as MessagePayload).senderId === 'string' &&
    typeof (obj as MessagePayload).receiverId === 'string' &&
    typeof (obj as MessagePayload).content === 'string' &&
    typeof (obj as MessagePayload).timestamp === 'string'
  );
}

@Injectable()
export class QueueService
  implements IQueueService, OnModuleInit, OnModuleDestroy
{
  private connection!: amqp.AmqpConnectionManager;
  private channelWrapper!: ChannelWrapper;
  private queueName: string;
  private readonly logger = new Logger(QueueService.name);

  constructor(private configService: ConfigService) {
    this.queueName = this.configService.get<string>(
      'RABBITMQ_QUEUE',
      'chat.messages',
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      const url = this.configService.get<string>(
        'RABBITMQ_URL',
        'amqp://guest:guest@localhost:5672',
      );

      // Create connection manager
      this.connection = amqp.connect([url], {
        heartbeatIntervalInSeconds: 30,
        reconnectTimeInSeconds: 5,
      });

      this.connection.on('connect', () => {
        this.logger.log('RabbitMQ connected successfully');
      });

      this.connection.on('disconnect', (err?: { err: Error }) => {
        const errorMessage = err?.err.message ?? 'Unknown reason';
        this.logger.error(`RabbitMQ disconnected: ${errorMessage}`);
      });

      // Create channel wrapper
      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: async (channel: Channel) => {
          // Assert queue exists
          await channel.assertQueue(this.queueName, {
            durable: true, // Queue survives broker restart
          });
          this.logger.log(`Queue "${this.queueName}" is ready`);
        },
      });

      await this.channelWrapper.waitForConnect();
    } catch (error) {
      this.logger.error('Failed to initialize RabbitMQ:', error);
      throw new AppException(ErrorCode.QUEUE_CONNECTION_ERROR, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channelWrapper.close();
      await this.connection.close();
      this.logger.log('RabbitMQ disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting RabbitMQ:', error);
    }
  }

  /**
   * Publish message to RabbitMQ
   */
  async publishMessage(payload: MessagePayload): Promise<void> {
    try {
      await this.channelWrapper.sendToQueue(this.queueName, payload, {
        persistent: true, // Message survives broker restart
        contentType: 'application/json',
      });
      this.logger.log(`Message published to queue: ${payload.messageId}`);
    } catch (error) {
      this.logger.error('Failed to publish message:', error);
      throw new AppException(ErrorCode.QUEUE_PUBLISH_FAILED, {
        messageId: payload.messageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Subscribe to messages from RabbitMQ
   * @param callback - Function to handle incoming messages
   */
  async consume(
    callback: (message: MessagePayload) => Promise<void>,
  ): Promise<void> {
    try {
      await this.channelWrapper.addSetup(async (channel: Channel) => {
        await channel.consume(
          this.queueName,
          (msg: ConsumeMessage | null) => {
            if (msg) {
              // Promise를 void로 처리 (fire and forget)
              void (async () => {
                try {
                  const content = msg.content.toString();
                  const parsed: unknown = JSON.parse(content);

                  // Validate payload type
                  if (!isMessagePayload(parsed)) {
                    throw new Error('Invalid message payload format');
                  }

                  const payload: MessagePayload = parsed;

                  // Process message
                  await callback(payload);

                  // Acknowledge message
                  channel.ack(msg);
                  this.logger.log(`Message processed: ${payload.messageId}`);
                } catch (error) {
                  this.logger.error('Error processing message:', error);
                  // Reject and requeue message on error
                  channel.nack(msg, false, true);
                }
              })();
            }
          },
          {
            noAck: false, // Manual acknowledgment
          },
        );
      });
    } catch (error) {
      this.logger.error('Failed to setup message consumer:', error);
      throw new AppException(ErrorCode.QUEUE_CONSUME_FAILED, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get channel wrapper for advanced operations
   */
  getChannelWrapper(): ChannelWrapper {
    return this.channelWrapper;
  }

  /**
   * Get queue name
   */
  getQueueName(): string {
    return this.queueName;
  }
}
