# Canvas Template Design

## Goal

Rilog의 글 작성 경험에 `Markdown`과 `Canvas` 두 가지 템플릿 선택지를 제공한다.

Markdown은 현재 완성된 기본 글쓰기 경험으로 유지하고, Canvas는 사용자가 종이 노트처럼 공간을 자유롭게 활용해 글, 이미지, 개념 정리를 배치할 수 있는 새로운 글 형식으로 추가한다.

## User Need

일반적인 블로그 글은 위에서 아래로 흐르는 문서 형식에 강하다. 하지만 개발자는 개념 사이의 관계, 흐름도, 비교, 사고 과정, 그림과 메모를 한 공간에 배치하고 싶을 때가 있다.

Rilog는 이 니즈를 글 템플릿 선택으로 해결한다.

- 선형 글쓰기가 필요하면 Markdown을 선택한다.
- 자유 배치형 필기가 필요하면 Canvas를 선택한다.

## Scope

### In Scope

- 게시글에 `contentType` 추가
  - `MARKDOWN`
  - `CANVAS`
- 새 글 작성 시 템플릿 선택 화면 제공
- Markdown 선택 시 기존 Markdown 에디터 사용
- Canvas 선택 시 Canvas 에디터 사용
- Canvas 글 작성/수정/저장
- Canvas 글 조회 렌더링
- Canvas 노드 MVP
  - 텍스트 노드
  - 이미지 노드
  - 드래그 이동
  - 크기 조절
  - 노드 내용 편집
- Canvas 데이터는 기존 `Post.content`에 JSON 문자열로 저장

### Out of Scope

- Excalidraw 수준의 자유 드로잉
- 선 연결
- 그룹
- 무한 캔버스 확대/축소
- 공동 편집
- Obsidian `.canvas` 완전 호환
- Markdown 글 내부에 Canvas 블록 삽입

## Domain Model

`Post`에 글 형식을 나타내는 enum을 추가한다.

```java
public enum PostContentType {
    MARKDOWN,
    CANVAS
}
```

`Post.content`는 그대로 유지한다.

- `MARKDOWN`: Markdown 문자열 저장
- `CANVAS`: Canvas JSON 문자열 저장

초기 구현에서는 별도 `CanvasDocument` 테이블을 만들지 않는다. Canvas가 아직 MVP이므로 저장 단위를 게시글 본문과 분리하면 복잡도만 커진다.

## Canvas JSON Format

초기 Canvas 문서 구조는 단순하게 유지한다.

```json
{
  "version": 1,
  "nodes": [
    {
      "id": "node-1",
      "type": "text",
      "x": 120,
      "y": 80,
      "width": 320,
      "height": 180,
      "content": "JPA 영속성 컨텍스트 정리"
    },
    {
      "id": "node-2",
      "type": "image",
      "x": 520,
      "y": 120,
      "width": 360,
      "height": 240,
      "url": "/uploads/example.png",
      "alt": "diagram"
    }
  ]
}
```

## Frontend Flow

### New Post

`#/write` 진입 시 템플릿 선택 화면을 보여준다.

- Markdown으로 작성
- Canvas로 작성

선택 후 라우트는 다음처럼 분기한다.

- `#/write?type=markdown`
- `#/write?type=canvas`

### Edit Post

기존 글 수정 시에는 저장된 `contentType`을 기준으로 에디터를 결정한다.

- `MARKDOWN`: 기존 Markdown 에디터
- `CANVAS`: Canvas 에디터

수정 중에는 글 타입을 변경하지 않는다. 타입 변경은 본문 데이터 손실 가능성이 있어 별도 기능으로 분리한다.

## Rendering Flow

글 상세 화면은 `post.contentType`으로 렌더러를 선택한다.

- `MARKDOWN`: `renderMarkdown(post.content)`
- `CANVAS`: `renderCanvas(JSON.parse(post.content))`

Canvas JSON 파싱에 실패하면 사용자가 볼 수 있는 안내 메시지를 보여주고, 콘솔에는 원인을 남긴다.

## API Contract

`PostRequest`와 `PostResponse`에 `contentType`을 추가한다.

기존 클라이언트 호환을 위해 요청에서 `contentType`이 없으면 `MARKDOWN`으로 처리한다.

```json
{
  "title": "JPA 정리",
  "contentType": "CANVAS",
  "content": "{\"version\":1,\"nodes\":[]}",
  "summary": "Canvas로 정리한 JPA 개념",
  "thumbnailUrl": null,
  "postStatus": "PUBLIC"
}
```

## UI Direction

Canvas 에디터는 기존 Rilog의 네이비 톤을 유지한다.

- 상단: 제목 입력
- 본문: 넓은 Canvas 작업 공간
- Canvas 툴바: 텍스트 추가, 이미지 추가
- 하단: 나가기, 임시저장, 발행하기

Markdown 에디터의 완성도를 해치지 않기 위해 Canvas 관련 코드는 별도 파일로 분리한다.

## Testing Strategy

### Backend

- `PostContentType` 기본값 검증
- Markdown 게시글 기존 생성/조회가 깨지지 않는지 검증
- Canvas 게시글 생성/조회 시 `contentType`과 JSON 문자열이 보존되는지 검증

### Frontend

- `#/write`에서 템플릿 선택 화면이 보이는지 확인
- Markdown 선택 시 기존 에디터가 열리는지 확인
- Canvas 선택 시 Canvas 에디터가 열리는지 확인
- Canvas JSON 직렬화/역직렬화 테스트
- Canvas 렌더러가 텍스트/이미지 노드를 표시하는지 테스트

## Risks

- Canvas 편집 경험은 금방 복잡해질 수 있으므로 MVP에서는 텍스트/이미지 노드만 지원한다.
- Canvas 데이터를 JSON 문자열로 저장하므로 서버는 초기 단계에서 구조를 깊게 검증하지 않는다.
- 타입 변경은 데이터 손실 위험이 있어 이번 범위에서 제외한다.

## Acceptance Criteria

- 새 글 작성 시 Markdown/Canvas 템플릿을 선택할 수 있다.
- Markdown 선택 시 기존 Markdown 작성 경험이 그대로 유지된다.
- Canvas 선택 시 텍스트와 이미지를 자유롭게 배치할 수 있다.
- Canvas 글을 발행하면 다시 조회했을 때 같은 위치와 크기로 보인다.
- 기존 Markdown 글 조회/수정/발행이 깨지지 않는다.
