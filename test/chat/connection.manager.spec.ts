/**
 * ConnectionManager 테스트 스위트
 * 
 * 이 테스트는 WebSocket 연결 관리를 담당하는 ConnectionManager를 검증합니다.
 * - 사용자 ID와 소켓 ID 간 매핑 관리
 * - 연결 추가/제거
 * - 연결 조회 (userId <-> socketId)
 * - 연결 상태 확인
 * - 연결 개수 확인
 * - 모든 연결 초기화
 */
import { ConnectionManager } from '../../src/chat/connection.manager';

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  /**
   * 각 테스트 전에 실행되는 설정
   * - 새로운 ConnectionManager 인스턴스 생성
   */
  beforeEach(() => {
    manager = new ConnectionManager();
  });

  /**
   * addConnection 테스트 그룹
   * 연결 추가 기능을 테스트합니다.
   */
  describe('addConnection', () => {
    /**
     * 새로운 연결 추가 테스트
     * - 사용자 ID와 소켓 ID를 매핑하여 저장
     * - 양방향 조회 가능 (userId -> socketId, socketId -> userId)
     * - 연결 개수 증가
     */
    it('should add a new connection', () => {
      const userId = 'user-1';
      const socketId = 'socket-1';

      manager.addConnection(userId, socketId);

      expect(manager.getSocketId(userId)).toBe(socketId);
      expect(manager.getUserId(socketId)).toBe(userId);
      expect(manager.isConnected(userId)).toBe(true);
      expect(manager.getConnectionCount()).toBe(1);
    });

    /**
     * 기존 연결 교체 테스트
     * - 동일한 사용자가 다시 연결하는 경우 (재연결)
     * - 기존 소켓 ID는 제거되고 새로운 소켓 ID로 교체
     * - 연결 개수는 1로 유지 (같은 사용자)
     */
    it('should replace existing connection for same user', () => {
      const userId = 'user-1';
      const oldSocketId = 'socket-1';
      const newSocketId = 'socket-2';

      manager.addConnection(userId, oldSocketId);
      manager.addConnection(userId, newSocketId);

      expect(manager.getSocketId(userId)).toBe(newSocketId);
      expect(manager.getUserId(oldSocketId)).toBeUndefined();
      expect(manager.getUserId(newSocketId)).toBe(userId);
      expect(manager.getConnectionCount()).toBe(1);
    });
  });

  /**
   * removeConnection 테스트 그룹
   * 연결 제거 기능을 테스트합니다.
   */
  describe('removeConnection', () => {
    /**
     * 기존 연결 제거 테스트
     * - 사용자 ID로 연결 제거
     * - 양방향 매핑 모두 제거
     * - 연결 개수 감소
     */
    it('should remove existing connection', () => {
      const userId = 'user-1';
      const socketId = 'socket-1';

      manager.addConnection(userId, socketId);
      manager.removeConnection(userId);

      expect(manager.getSocketId(userId)).toBeUndefined();
      expect(manager.getUserId(socketId)).toBeUndefined();
      expect(manager.isConnected(userId)).toBe(false);
      expect(manager.getConnectionCount()).toBe(0);
    });

    /**
     * 존재하지 않는 연결 제거 시도 테스트
     * - 오류를 던지지 않고 안전하게 처리
     */
    it('should handle removal of non-existent connection gracefully', () => {
      const userId = 'non-existent';

      expect(() => manager.removeConnection(userId)).not.toThrow();
      expect(manager.getConnectionCount()).toBe(0);
    });
  });

  /**
   * clearAll 테스트 그룹
   * 모든 연결 초기화 기능을 테스트합니다.
   */
  describe('clearAll', () => {
    /**
     * 모든 연결 초기화 테스트
     * - 모든 연결 정보 제거
     * - 연결 개수 0으로 초기화
     */
    it('should clear all connections', () => {
      manager.addConnection('user-1', 'socket-1');
      manager.addConnection('user-2', 'socket-2');

      expect(manager.getConnectionCount()).toBe(2);

      manager.clearAll();

      expect(manager.getConnectionCount()).toBe(0);
      expect(manager.isConnected('user-1')).toBe(false);
      expect(manager.isConnected('user-2')).toBe(false);
    });
  });

  
});

