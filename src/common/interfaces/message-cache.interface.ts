/**
 * Message Cache Interface
 *
 * 메시지 임시 캐싱을 담당
 */
export interface IMessageCache {
  /**
   * 메시지 임시 캐싱
   */
  cacheMessage(
    messageId: string,
    data: {
      senderId: string;
      receiverId: string;
      content: string;
      timestamp: string;
    },
  ): Promise<void>;

  /**
   * 캐시된 메시지 조회
   */
  getCachedMessage(messageId: string): Promise<{
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: string;
  } | null>;

  /**
   * 캐시된 메시지 삭제
   */
  deleteCachedMessage(messageId: string): Promise<void>;
}
