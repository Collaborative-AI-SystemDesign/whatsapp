/**
 * User Connection Cache Interface
 *
 * WebSocket 사용자 연결 상태 관리를 담당
 */
export interface IUserConnectionCache {
  /**
   * 사용자-서버 연결 매핑 저장
   */
  setUserConnection(userId: string, serverId: string): Promise<void>;

  /**
   * 사용자가 온라인인지 확인
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
}
