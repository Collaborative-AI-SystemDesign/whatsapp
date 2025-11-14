import { Injectable, Logger } from '@nestjs/common';
import { IConnectionManager } from '../common/interfaces';

/**
 * ConnectionManager
 *
 * WebSocket 연결의 userId <-> socketId 매핑을 관리
 * Single Responsibility: 연결 매핑 관리만 담당
 */
@Injectable()
export class ConnectionManager implements IConnectionManager {
  private readonly logger = new Logger(ConnectionManager.name);

  // userId -> socketId 매핑
  private userSocketMap: Map<string, string> = new Map();
  // socketId -> userId 매핑
  private socketUserMap: Map<string, string> = new Map();

  /**
   * 사용자 연결 추가
   */
  addConnection(userId: string, socketId: string): void {
    // 기존 연결이 있다면 제거 (같은 사용자가 다른 소켓으로 재연결한 경우)
    const existingSocketId = this.userSocketMap.get(userId);
    if (existingSocketId != null) {
      this.socketUserMap.delete(existingSocketId);
      this.logger.warn(
        `User ${userId} reconnected. Old socket ${existingSocketId} replaced with ${socketId}`,
      );
    }

    this.userSocketMap.set(userId, socketId);
    this.socketUserMap.set(socketId, userId);

    this.logger.log(
      `Connection added: userId=${userId}, socketId=${socketId} (total: ${String(this.getConnectionCount())})`,
    );
  }

  /**
   * 사용자 연결 제거
   */
  removeConnection(userId: string): void {
    const socketId = this.userSocketMap.get(userId);

    if (socketId != null) {
      this.userSocketMap.delete(userId);
      this.socketUserMap.delete(socketId);

      this.logger.log(
        `Connection removed: userId=${userId}, socketId=${socketId} (total: ${String(this.getConnectionCount())})`,
      );
    } else {
      this.logger.warn(
        `Attempted to remove non-existent connection: ${userId}`,
      );
    }
  }

  /**
   * userId로 socketId 조회
   */
  getSocketId(userId: string): string | undefined {
    return this.userSocketMap.get(userId);
  }

  /**
   * socketId로 userId 조회
   */
  getUserId(socketId: string): string | undefined {
    return this.socketUserMap.get(socketId);
  }

  /**
   * 사용자가 연결되어 있는지 확인
   */
  isConnected(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }

  /**
   * 현재 연결된 모든 사용자 수
   */
  getConnectionCount(): number {
    return this.userSocketMap.size;
  }

  /**
   * 모든 연결 초기화 (테스트용)
   */
  clearAll(): void {
    const count = this.getConnectionCount();
    this.userSocketMap.clear();
    this.socketUserMap.clear();
    this.logger.log(
      `All connections cleared (${String(count)} connections removed)`,
    );
  }

  /**
   * 디버깅용: 모든 연결 정보 반환
   */
  getAllConnections(): Array<{ userId: string; socketId: string }> {
    const connections: Array<{ userId: string; socketId: string }> = [];

    for (const [userId, socketId] of this.userSocketMap.entries()) {
      connections.push({ userId, socketId });
    }

    return connections;
  }
}
