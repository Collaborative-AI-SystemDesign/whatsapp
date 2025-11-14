export const QUEUE_SERVICE = Symbol('IQueueService');
export const CONNECTION_MANAGER = Symbol('IConnectionManager');

// Cache Service Tokens (Interface Segregation)
export const USER_CONNECTION_CACHE = Symbol('IUserConnectionCache');
export const MESSAGE_INBOX_CACHE = Symbol('IMessageInboxCache');
export const MESSAGE_CACHE = Symbol('IMessageCache');
