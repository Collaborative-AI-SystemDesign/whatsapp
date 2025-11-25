# 📦 설치 가이드 - 호환성 확인 및 설치 방법

### 필수 Node.js 버전 요구사항

| 패키지 | 요구 Node.js 버전 |
|--------|------------------|
| **@nestjs/cli** (v11.0.0) | `^18.19.1 \|\| ^20.11.1 \|\| >=22.0.0` |
| **@nestjs/core** (v11.0.1) | `^18.19.1 \|\| ^20.11.1 \|\| >=22.0.0` |
| **TypeScript** (v5.7.3) | `>=18` |
| **Prisma** (v6.17.1) | `>=18` |

**권장 Node.js 버전: 20.x LTS 또는 22.x**

---

## 🔧 설치 방법

### 1단계: Node.js 버전 업그레이드

#### 방법 A: nvm 사용 (권장)

```bash
# nvm이 설치되어 있지 않다면 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 터미널 재시작 또는 다음 명령 실행
source ~/.zshrc  # 또는 ~/.bashrc

# Node.js 20 LTS 설치
nvm install 20

# Node.js 20 사용
nvm use 20

# 기본 버전으로 설정 (선택사항)
nvm alias default 20

# 버전 확인
node --version  # v20.x.x가 나와야 함
npm --version
```

#### 방법 B: 공식 웹사이트에서 설치

1. [Node.js 공식 웹사이트](https://nodejs.org/) 방문
2. **LTS 버전 (20.x)** 다운로드 및 설치
3. 터미널 재시작 후 버전 확인:
   ```bash
   node --version
   npm --version
   ```

---

### 2단계: 기존 node_modules 및 lock 파일 정리

```bash
# 프로젝트 디렉토리로 이동
cd /Users/mac/Desktop/whatsapp

# 기존 node_modules 삭제
rm -rf node_modules

# package-lock.json 삭제 (선택사항, 깨끗한 설치를 위해)
rm -f package-lock.json
```

---

### 3단계: 의존성 설치

#### 옵션 1: npm 사용 (권장)

```bash
# npm 캐시 정리 (선택사항)
npm cache clean --force

# 의존성 설치
npm install

# 설치 확인
npm list --depth=0
```

#### 옵션 2: npm ci 사용 (package-lock.json이 있는 경우)

```bash
# package-lock.json 기반으로 정확한 버전 설치
npm ci
```

---

## 📋 주요 패키지 버전 확인

설치 후 다음 명령으로 주요 패키지 버전을 확인할 수 있습니다:

```bash
# NestJS 관련
npm list @nestjs/core @nestjs/common @nestjs/cli

# TypeScript
npm list typescript

# Prisma
npm list prisma @prisma/client

# Socket.IO
npm list socket.io @nestjs/platform-socket.io

# 전체 의존성 트리 확인
npm list --depth=1
```

---

## ✅ 설치 확인 체크리스트

설치가 완료되면 다음을 확인하세요:

- [ ] Node.js 버전이 18.19.1 이상인가? (`node --version`)
- [ ] npm 버전이 8.0.0 이상인가? (`npm --version`)
- [ ] `node_modules` 폴더가 생성되었는가?
- [ ] `package-lock.json`이 생성되었는가?
- [ ] 빌드가 성공하는가? (`npm run build`)
- [ ] 개발 서버가 실행되는가? (`npm run start:dev`)

---

## 🐛 문제 해결

### 문제 1: "Unsupported engine" 에러

**증상:**
```
error Unsupported engine: wanted: {"node":"^18.19.1 || ^20.11.1 || >=22.0.0"}
```

**해결:**
- Node.js 버전을 18.19.1 이상으로 업그레이드하세요.

### 문제 2: "Cannot find module" 에러

**증상:**
```
Error: Cannot find module '@nestjs/core'
```

**해결:**
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

---

## 📦 현재 프로젝트의 주요 의존성 버전

### Production Dependencies

| 패키지 | 버전 | Node.js 요구사항 |
|--------|------|-----------------|
| @nestjs/common | ^11.0.1 | >=18.19.1 |
| @nestjs/core | ^11.0.1 | >=18.19.1 |
| @nestjs/platform-socket.io | ^11.1.8 | >=18.19.1 |
| @nestjs/websockets | ^11.1.8 | >=18.19.1 |
| @prisma/client | ^6.17.1 | >=18 |
| socket.io | ^4.8.1 | >=6.9.0 |
| mongoose | ^8.19.3 | >=6.9.0 |
| ioredis | ^5.8.2 | >=6.9.0 |

### Development Dependencies

| 패키지 | 버전 | Node.js 요구사항 |
|--------|------|-----------------|
| @nestjs/cli | ^11.0.0 | >=18.19.1 |
| typescript | ^5.7.3 | >=18 |
| prisma | ^6.17.1 | >=18 |
| jest | ^30.0.0 | >=18 |

---

## 🚀 빠른 시작 (전체 과정)

```bash
# 1. Node.js 버전 확인 및 업그레이드
node --version  # 18.19.1 이상이어야 함
# 필요시: nvm install 20 && nvm use 20

# 2. 프로젝트 디렉토리로 이동
cd /Users/mac/Desktop/whatsapp

# 3. 기존 설치 파일 정리
rm -rf node_modules package-lock.json

# 4. 의존성 설치
npm install

# 5. Prisma Client 생성
npm run prisma:generate

# 6. 빌드 테스트
npm run build

# 7. 개발 서버 실행
npm run start:dev
```

---

## 📝 참고사항

1. **package-lock.json**: 이 파일은 정확한 의존성 버전을 보장하므로 버전 관리에 포함해야 합니다.
2. **Node.js LTS**: 프로덕션 환경에서는 LTS(Long Term Support) 버전 사용을 권장합니다.
3. **의존성 업데이트**: 정기적으로 `npm outdated`로 업데이트 가능한 패키지를 확인하세요.
4. **보안 취약점**: `npm audit`으로 보안 취약점을 확인하고 수정하세요.

---

## 🔗 유용한 링크

- [Node.js 공식 사이트](https://nodejs.org/)
- [NestJS 공식 문서](https://docs.nestjs.com/)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Socket.IO 공식 문서](https://socket.io/docs/v4/)

---

**마지막 업데이트:** 2025년








