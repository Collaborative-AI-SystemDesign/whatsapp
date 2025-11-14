export interface ICacheService {
  /**
   * 사용자 연결 정보 저장
   */
  setUserConnection(userId: string, serverId: string): Promise<void>;

  /**
   * 사용자 온라인 여부 확인
   */
  isUserOnline(userId: string): Promise<boolean>;

  /**
   * 사용자 연결 정보 삭제
   */
  removeUserConnection(userId: string): Promise<void>;

  /**
   * 사용자 서버 ID 조회
   */
  getUserServerId(userId: string): Promise<string | null>;

  /**
   * 미전달 메시지를 inbox에 추가
   */
  addToInbox(userId: string, messageId: string): Promise<void>;

  /**
   * inbox에서 모든 미전달 메시지 ID 조회
   */
  getInbox(userId: string): Promise<string[]>;

  /**
   * inbox 삭제
   */
  clearInbox(userId: string): Promise<void>;

  /**
   * inbox에서 특정 메시지 ID 제거
   */
  removeFromInbox(userId: string, messageId: string): Promise<void>;

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
