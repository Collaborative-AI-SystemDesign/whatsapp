#!/usr/bin/env node

/**
 * WhatsApp Clone - Socket.IO Test Client
 *
 * Usage:
 *   node test-socket-client.js [userId] [receiverId]
 *
 * Example:
 *   Terminal 1: node test-socket-client.js user_alice user_bob
 *   Terminal 2: node test-socket-client.js user_bob user_alice
 */

const io = require('socket.io-client');
const readline = require('readline');

// 명령줄 인자 파싱
const userId = process.argv[2] || 'user_alice';
const receiverId = process.argv[3] || 'user_bob';
const serverUrl = process.argv[4] || 'http://localhost:3000';

console.log('\n=================================');
console.log('WhatsApp Clone - Test Client');
console.log('=================================');
console.log(`User ID: ${userId}`);
console.log(`Receiver ID: ${receiverId}`);
console.log(`Server URL: ${serverUrl}`);
console.log('=================================\n');

// Socket.IO 연결
const socket = io(serverUrl, {
  query: { userId },
  transports: ['websocket', 'polling']
});

let messageCounter = 0;

// 연결 이벤트
socket.on('connect', () => {
  console.log(`✅ [${getTimestamp()}] Connected to server`);
  console.log(`   Socket ID: ${socket.id}`);
  console.log('\n📝 Type your message and press Enter to send (or type "exit" to quit)\n');
});

// 연결 해제 이벤트
socket.on('disconnect', (reason) => {
  console.log(`\n❌ [${getTimestamp()}] Disconnected from server`);
  console.log(`   Reason: ${reason}`);
});

// 연결 오류 이벤트
socket.on('connect_error', (error) => {
  console.error(`\n🔴 [${getTimestamp()}] Connection error:`, error.message);
});

// 메시지 수신 확인 이벤트
socket.on('message_received', (data) => {
  console.log(`\n📤 [${getTimestamp()}] Message sent successfully!`);
  console.log(`   Message ID: ${data.message_id}`);
  console.log(`   Client Message ID: ${data.message_id_by_client}`);
  console.log(`   Timestamp: ${new Date(data.timestamp).toLocaleString()}`);
});

// 메시지 수신 이벤트
socket.on('incoming_message', (data) => {
  console.log(`\n📥 [${getTimestamp()}] New message received!`);
  console.log(`   From: ${data.sender_id}`);
  console.log(`   Message ID: ${data.message_id}`);
  console.log(`   Content: "${data.content}"`);
  console.log(`   Timestamp: ${new Date(data.timestamp).toLocaleString()}`);

  // 전달 확인 전송
  socket.emit('message_delivered', {
    message_id: data.message_id,
    timestamp: Date.now()
  });

  console.log(`   ✓ Delivery confirmation sent`);
});

// 에러 이벤트
socket.on('error', (error) => {
  console.error(`\n🔴 [${getTimestamp()}] Error:`, error);
});

// 재연결 이벤트
socket.on('reconnect', (attemptNumber) => {
  console.log(`\n🔄 [${getTimestamp()}] Reconnected after ${attemptNumber} attempt(s)`);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`\n⏳ [${getTimestamp()}] Reconnection attempt #${attemptNumber}...`);
});

socket.on('reconnect_error', (error) => {
  console.error(`\n🔴 [${getTimestamp()}] Reconnection error:`, error.message);
});

socket.on('reconnect_failed', () => {
  console.error(`\n🔴 [${getTimestamp()}] Reconnection failed`);
});

// 표준 입력 인터페이스 설정
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${userId} > `
});

// 연결 후 프롬프트 표시
socket.on('connect', () => {
  rl.prompt();
});

// 사용자 입력 처리
rl.on('line', (line) => {
  const input = line.trim();

  // 종료 명령
  if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
    console.log('\n👋 Disconnecting...');
    socket.disconnect();
    rl.close();
    process.exit(0);
  }

  // 빈 입력 무시
  if (!input) {
    rl.prompt();
    return;
  }

  // 특수 명령 처리
  if (input.startsWith('/')) {
    handleCommand(input);
    rl.prompt();
    return;
  }

  // 메시지 전송
  sendMessage(input);
  rl.prompt();
});

// 프로세스 종료 처리
rl.on('close', () => {
  console.log('\n👋 Goodbye!');
  socket.disconnect();
  process.exit(0);
});

// 메시지 전송 함수
function sendMessage(content) {
  if (!socket.connected) {
    console.log('\n❌ Not connected to server. Cannot send message.');
    return;
  }

  messageCounter++;

  const message = {
    action: 'send_message',
    receiver_id: receiverId,
    content: content,
    message_id_by_client: messageCounter,
    timestamp: Date.now()
  };

  socket.emit('send_message', message);

  console.log(`\n📨 [${getTimestamp()}] Sending message...`);
  console.log(`   To: ${receiverId}`);
  console.log(`   Content: "${content}"`);
  console.log(`   Client Message ID: ${messageCounter}`);
}

// 특수 명령 처리
function handleCommand(command) {
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();

  switch (cmd) {
    case '/help':
      showHelp();
      break;

    case '/status':
      showStatus();
      break;

    case '/to':
      if (parts[1]) {
        global.receiverId = parts[1];
        console.log(`\n✓ Receiver changed to: ${parts[1]}`);
      } else {
        console.log('\n❌ Usage: /to <userId>');
      }
      break;

    case '/ping':
      console.log(`\n🏓 Ping sent at ${getTimestamp()}`);
      socket.emit('ping', { timestamp: Date.now() });
      break;

    case '/clear':
      console.clear();
      console.log('\n=================================');
      console.log('WhatsApp Clone - Test Client');
      console.log('=================================\n');
      break;

    default:
      console.log(`\n❌ Unknown command: ${cmd}`);
      console.log('   Type /help for available commands');
  }
}

// 도움말 표시
function showHelp() {
  console.log('\n=================================');
  console.log('Available Commands:');
  console.log('=================================');
  console.log('/help       - Show this help message');
  console.log('/status     - Show connection status');
  console.log('/to <id>    - Change receiver ID');
  console.log('/ping       - Send ping to server');
  console.log('/clear      - Clear screen');
  console.log('exit        - Disconnect and exit');
  console.log('=================================\n');
}

// 상태 표시
function showStatus() {
  console.log('\n=================================');
  console.log('Connection Status:');
  console.log('=================================');
  console.log(`User ID:        ${userId}`);
  console.log(`Socket ID:      ${socket.id || 'N/A'}`);
  console.log(`Connected:      ${socket.connected ? '✅ Yes' : '❌ No'}`);
  console.log(`Server URL:     ${serverUrl}`);
  console.log(`Receiver ID:    ${receiverId}`);
  console.log(`Messages sent:  ${messageCounter}`);
  console.log('=================================\n');
}

// 타임스탬프 포맷팅
function getTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString('ko-KR', { hour12: false });
}

// Ctrl+C 처리
process.on('SIGINT', () => {
  console.log('\n\n👋 Caught interrupt signal, disconnecting...');
  socket.disconnect();
  rl.close();
  process.exit(0);
});

// 처리되지 않은 에러 처리
process.on('uncaughtException', (error) => {
  console.error('\n🔴 Uncaught exception:', error);
  socket.disconnect();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n🔴 Unhandled rejection at:', promise, 'reason:', reason);
});
