/**
 * Message Inbox Cache Interface
 *
 * 미전달 메시지 inbox 관리를 담당
 */
export interface IMessageInboxCache {
  /**
   * 미전달 메시지를 inbox에 추가
   */
  addToInbox(userId: string, messageId: string): Promise<void>;

  /**
   * inbox에서 모든 미전달 메시지 ID 조회
   */
  getInbox(userId: string): Promise<string[]>;

  /**
   * inbox 삭제 (모든 메시지 전달 완료 후)
   */
  clearInbox(userId: string): Promise<void>;

  /**
   * inbox에서 특정 메시지 ID 제거
   */
  removeFromInbox(userId: string, messageId: string): Promise<void>;
}
