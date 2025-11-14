export interface IConnectionManager {
  /**
   * 사용자 연결 추가
   */
  addConnection(userId: string, socketId: string): void;

  /**
   * 사용자 연결 제거
   */
  removeConnection(userId: string): void;

  /**
   * userId로 socketId 조회
   */
  getSocketId(userId: string): string | undefined;

  /**
   * socketId로 userId 조회
   */
  getUserId(socketId: string): string | undefined;

  /**
   * 사용자가 연결되어 있는지 확인
   */
  isConnected(userId: string): boolean;

  /**
   * 현재 연결된 모든 사용자 수
   */
  getConnectionCount(): number;

  /**
   * 모든 연결 초기화 (테스트용)
   */
  clearAll(): void;
}
