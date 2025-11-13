import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';

export interface MessagePayload {
  messageId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  messageIdByClient?: number;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private queueName: string;

  constructor(private configService: ConfigService) {
    this.queueName = this.configService.get<string>(
      'RABBITMQ_QUEUE',
      'chat.messages',
    );
  }

  async onModuleInit() {
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
      console.log('RabbitMQ connected successfully');
    });

    this.connection.on('disconnect', (err) => {
      console.error('RabbitMQ disconnected:', err?.message);
    });

    // Create channel wrapper
    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: Channel) => {
        // Assert queue exists
        await channel.assertQueue(this.queueName, {
          durable: true, // Queue survives broker restart
        });
        console.log(`Queue "${this.queueName}" is ready`);
      },
    });

    await this.channelWrapper.waitForConnect();
  }

  async onModuleDestroy() {
    await this.channelWrapper.close();
    await this.connection.close();
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
      console.log(`Message published to queue: ${payload.messageId}`);
    } catch (error) {
      console.error('Failed to publish message:', error);
      throw error;
    }
  }

  /**
   * Subscribe to messages from RabbitMQ
   * @param callback - Function to handle incoming messages
   */
  async consume(
    callback: (message: MessagePayload) => Promise<void>,
  ): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: Channel) => {
      await channel.consume(
        this.queueName,
        async (msg: ConsumeMessage | null) => {
          if (msg) {
            try {
              const content = msg.content.toString();
              const payload: MessagePayload = JSON.parse(content);

              // Process message
              await callback(payload);

              // Acknowledge message
              channel.ack(msg);
              console.log(`Message processed: ${payload.messageId}`);
            } catch (error) {
              console.error('Error processing message:', error);
              // Reject and requeue message on error
              channel.nack(msg, false, true);
            }
          }
        },
        {
          noAck: false, // Manual acknowledgment
        },
      );
    });
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
