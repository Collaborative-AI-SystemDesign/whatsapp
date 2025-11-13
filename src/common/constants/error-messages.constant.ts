import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';

/**
 * 에러 코드별 메타데이터
 */
export interface ErrorMetadata {
  message: string;
  statusCode: HttpStatus;
}

/**
 * 에러 코드 → HTTP 상태 코드 및 메시지 매핑
 */
export const ERROR_MESSAGES: Record<ErrorCode, ErrorMetadata> = {
  // ============================================
  // User Domain
  // ============================================
  [ErrorCode.USER_NOT_FOUND]: {
    message: 'User not found',
    statusCode: HttpStatus.NOT_FOUND,
  },
  [ErrorCode.USER_ALREADY_EXISTS]: {
    message: 'Username already exists',
    statusCode: HttpStatus.CONFLICT,
  },
  [ErrorCode.EMAIL_ALREADY_EXISTS]: {
    message: 'Email already exists',
    statusCode: HttpStatus.CONFLICT,
  },
  [ErrorCode.INVALID_USER_ID]: {
    message: 'Invalid user ID',
    statusCode: HttpStatus.BAD_REQUEST,
  },

  // ============================================
  // ChatRoom Domain
  // ============================================
  [ErrorCode.CHATROOM_NOT_FOUND]: {
    message: 'Chat room not found',
    statusCode: HttpStatus.NOT_FOUND,
  },
  [ErrorCode.NOT_CHATROOM_PARTICIPANT]: {
    message: 'You are not a participant of this chat room',
    statusCode: HttpStatus.FORBIDDEN,
  },
  [ErrorCode.CHATROOM_ALREADY_EXISTS]: {
    message: 'Chat room already exists between these users',
    statusCode: HttpStatus.CONFLICT,
  },
  [ErrorCode.INVALID_CHATROOM_ID]: {
    message: 'Invalid chat room ID',
    statusCode: HttpStatus.BAD_REQUEST,
  },

  // ============================================
  // Message Domain
  // ============================================
  [ErrorCode.MESSAGE_NOT_FOUND]: {
    message: 'Message not found',
    statusCode: HttpStatus.NOT_FOUND,
  },
  [ErrorCode.MESSAGE_TOO_LONG]: {
    message: 'Message exceeds maximum length',
    statusCode: HttpStatus.BAD_REQUEST,
  },
  [ErrorCode.INVALID_MESSAGE_ID]: {
    message: 'Invalid message ID',
    statusCode: HttpStatus.BAD_REQUEST,
  },
  [ErrorCode.MESSAGE_SEND_FAILED]: {
    message: 'Failed to send message',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  },

  // ============================================
  // Cache Domain (Redis)
  // ============================================
  [ErrorCode.CACHE_CONNECTION_ERROR]: {
    message: 'Failed to connect to cache server',
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
  },
  [ErrorCode.CACHE_OPERATION_FAILED]: {
    message: 'Cache operation failed',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  },

  // ============================================
  // Queue Domain (RabbitMQ)
  // ============================================
  [ErrorCode.QUEUE_CONNECTION_ERROR]: {
    message: 'Failed to connect to message queue',
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
  },
  [ErrorCode.QUEUE_PUBLISH_FAILED]: {
    message: 'Failed to publish message to queue',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  [ErrorCode.QUEUE_CONSUME_FAILED]: {
    message: 'Failed to consume message from queue',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  },

  // ============================================
  // Common / Validation
  // ============================================
  [ErrorCode.INVALID_OBJECT_ID]: {
    message: 'Invalid MongoDB ObjectId format',
    statusCode: HttpStatus.BAD_REQUEST,
  },
  [ErrorCode.VALIDATION_ERROR]: {
    message: 'Validation failed',
    statusCode: HttpStatus.BAD_REQUEST,
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    message: 'Internal server error',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  [ErrorCode.FORBIDDEN]: {
    message: 'Forbidden',
    statusCode: HttpStatus.FORBIDDEN,
  },
  [ErrorCode.UNAUTHORIZED]: {
    message: 'Unauthorized',
    statusCode: HttpStatus.UNAUTHORIZED,
  },

  // ============================================
  // Database
  // ============================================
  [ErrorCode.DUPLICATE_KEY]: {
    message: 'Duplicate key violation',
    statusCode: HttpStatus.CONFLICT,
  },
  [ErrorCode.FOREIGN_KEY_CONSTRAINT]: {
    message: 'Foreign key constraint violation',
    statusCode: HttpStatus.BAD_REQUEST,
  },
  [ErrorCode.NULL_CONSTRAINT_VIOLATION]: {
    message: 'Required field cannot be null',
    statusCode: HttpStatus.BAD_REQUEST,
  },
  [ErrorCode.DATABASE_ERROR]: {
    message: 'Database error occurred',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  },
};
