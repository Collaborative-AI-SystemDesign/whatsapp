/**
 * 애플리케이션 전역 에러 코드
 *
 * 네이밍 규칙: {DOMAIN}_{ERROR_TYPE}
 */
export enum ErrorCode {
  // ============================================
  // User Domain
  // ============================================
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_USER_ID = 'INVALID_USER_ID',

  // ============================================
  // ChatRoom Domain
  // ============================================
  CHATROOM_NOT_FOUND = 'CHATROOM_NOT_FOUND',
  NOT_CHATROOM_PARTICIPANT = 'NOT_CHATROOM_PARTICIPANT',
  CHATROOM_ALREADY_EXISTS = 'CHATROOM_ALREADY_EXISTS',
  INVALID_CHATROOM_ID = 'INVALID_CHATROOM_ID',

  // ============================================
  // Message Domain
  // ============================================
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  INVALID_MESSAGE_ID = 'INVALID_MESSAGE_ID',
  MESSAGE_SEND_FAILED = 'MESSAGE_SEND_FAILED',

  // ============================================
  // Common / Validation
  // ============================================
  INVALID_OBJECT_ID = 'INVALID_OBJECT_ID',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  FORBIDDEN = 'FORBIDDEN',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // ============================================
  // Database
  // ============================================
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
  NULL_CONSTRAINT_VIOLATION = 'NULL_CONSTRAINT_VIOLATION',
  DATABASE_ERROR = 'DATABASE_ERROR',
}
