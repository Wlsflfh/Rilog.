# Rilog.

개발자의 기록이 더 멀리 닿도록 만드는 블로그 플랫폼입니다.

Rilog는 Markdown 기반 글쓰기, Google OAuth2 로그인, 좋아요·댓글·통계·프로필 기능을 중심으로 개발 중인 블로그 서비스입니다.  
목표는 Velog, Tistory처럼 글을 올리는 공간을 넘어서, 개발자가 편하게 쓰고 조용히 발견될 수 있는 플랫폼을 만드는 것입니다.

## 프로젝트 방향

Rilog가 중요하게 보는 사용자의 니즈는 두 가지입니다.

- 사람들은 은은하게 관심을 받고 싶어 합니다.  
  좋은 글이 검색과 피드를 통해 자연스럽게 더 많이 노출되어야 합니다.
- 사람들은 지속적으로 쌓이는 소소한 업적에 기쁨을 느낍니다.  
  조회수, 좋아요, 댓글, 글 작성 흐름 같은 통계와 기록이 사용자에게 작은 성취감을 줘야 합니다.

## 주요 기능

### 글 작성

- Markdown 기반 글 작성
- 작성 화면과 미리보기 동시 제공
- Markdown 단축키 지원
  - `Cmd + B`: 굵게
  - `Cmd + I`: 기울임
  - `Cmd + K`: 링크
  - 인라인 코드, 코드 블록, 인용, 목록, 취소선 등
- 입력 자동완성
  - `# + Space`: 제목
  - `> + Space`: 인용문
  - `1. + Space`: 번호 목록
  - `--- + Enter`: 구분선
  - 백틱 기반 코드 블록
- 글자 색상 적용
- 표 삽입과 행/열 추가 UI
- 이미지 업로드
- 여러 이미지를 붙여 올렸을 때 그리드로 표시
- 이미지 클릭 확대 보기

### 글 조회

- 공개 글 피드 조회
- 개별 글 조회
- Markdown 렌더링
- 제목 기반 목차 표시
- 조회수 증가
- 좋아요 누른 사람 말풍선 표시

### 사용자 기능

- Google OAuth2 Login 기반 서버 세션 로그인
- 내 글 조회
- 내 블로그 프로필 조회
- 프로필 소개 수정
- 댓글 작성/삭제
- 좋아요/좋아요 취소

### 통계

- 내 글 수
- 총 조회수
- 총 좋아요 수
- 댓글 수
- 최근 반응 요약

## 기술 스택

- Java 21
- Spring Boot 3.3.5
- Spring MVC
- Spring Security
- OAuth2 Client
- Spring Data JPA
- MySQL
- H2 Test Database
- Vanilla JavaScript
- HTML/CSS

## 실행 방법

### 1. MySQL 실행

기본 설정은 로컬 MySQL의 `blog` 데이터베이스를 사용합니다.

```sql
CREATE DATABASE blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

기본 접속 정보는 [application.yml](/Users/jinriro/java/spring-roomescape-member_practice/src/main/resources/application.yml) 기준입니다.

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/blog
    username: root
    password: password
```

### 2. Google OAuth2 설정

Google Cloud Console에서 OAuth 2.0 Client를 만들고 승인된 리디렉션 URI를 등록합니다.

```text
http://localhost:8080/login/oauth2/code/google
```

실행 전 환경변수를 설정합니다.

```bash
export GOOGLE_CLIENT_ID=발급받은-client-id
export GOOGLE_CLIENT_SECRET=발급받은-client-secret
```

### 3. 애플리케이션 실행

```bash
./gradlew bootRun
```

브라우저에서 접속합니다.

```text
http://localhost:8080
```

## 주요 API

### 인증

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/oauth2/authorization/google` | Google 로그인 시작 |
| `GET` | `/auth/me` | 현재 로그인 사용자 조회 |
| `GET` | `/auth/csrf` | CSRF 토큰 조회 |
| `POST` | `/logout` | 로그아웃 |

### 게시글

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/posts` | 공개 글 목록 조회 |
| `GET` | `/posts/{postId}` | 글 상세 조회 |
| `GET` | `/posts/me` | 내 글 목록 조회 |
| `POST` | `/posts` | 글 작성 |
| `PUT` | `/posts/{postId}` | 글 수정 |
| `DELETE` | `/posts/{postId}` | 글 삭제 |

### 좋아요

| Method | Path | 설명 |
| --- | --- | --- |
| `PUT` | `/posts/{postId}/likes` | 좋아요 |
| `DELETE` | `/posts/{postId}/likes` | 좋아요 취소 |
| `GET` | `/posts/{postId}/likes/users` | 좋아요 누른 사용자 조회 |

### 댓글

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/posts/{postId}/comments` | 댓글 목록 조회 |
| `POST` | `/posts/{postId}/comments` | 댓글 작성 |
| `DELETE` | `/posts/{postId}/comments/{commentId}` | 댓글 삭제 |

### 사용자·통계·이미지

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/users/{username}` | 사용자 프로필 조회 |
| `GET` | `/users/{username}/posts` | 사용자 글 목록 조회 |
| `PATCH` | `/users/me/profile` | 내 프로필 수정 |
| `GET` | `/stats/me` | 내 통계 조회 |
| `POST` | `/images` | 이미지 업로드 |

## 에러 응답

모든 애플리케이션 에러 응답은 아래 형식을 따릅니다.

```json
{
  "code": "NOT_FOUND",
  "message": "요청한 리소스를 찾을 수 없습니다."
}
```

- `BlogException`은 서비스 계층에서 맥락 로그를 남기고, 전역 핸들러는 응답 변환만 담당합니다.
- 예상하지 못한 예외는 `GlobalExceptionHandler`에서 `error` 레벨 스택트레이스로 남깁니다.

## 테스트

### Java 테스트

```bash
./gradlew test
```

### Markdown JavaScript 테스트

```bash
node --test src/test/js/markdown.test.mjs src/test/js/markdown-editor.test.mjs
```

## 테스트 작성 규칙

- 테스트 메서드명은 의도가 드러나는 간단한 영어로 작성합니다.
- 테스트 설명은 `@DisplayName`에 한글로 작성합니다.
- 테스트 본문은 `// given`, `// when`, `// then` 주석으로 구분합니다.
- 예외 검증처럼 실행과 검증이 붙어 있는 경우 `// when - then`을 사용합니다.

## 개발 메모

- 업로드된 이미지는 로컬 개발 환경에서 `/uploads/**` 경로로 제공됩니다.
- 실제 업로드 파일은 Git에 포함하지 않도록 `.gitignore`에 등록되어 있습니다.
- 현재 JPA 설정은 개발 편의를 위해 `ddl-auto: create`입니다.
- 운영 환경에서는 DB 스키마 관리, 이미지 저장소, 세션 쿠키 `Secure` 설정, OAuth 승인 도메인 설정을 별도로 분리해야 합니다.
