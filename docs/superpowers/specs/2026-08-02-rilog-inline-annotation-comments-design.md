# Rilog Inline Annotation Comments Design

## Goal

Rilog에 게시글 하단 일반 댓글과 별개로, 본문의 특정 문장이나 단어 범위에 직접 붙는 댓글을 추가한다.

사용자는 글 상세 화면에서 텍스트를 선택해 메모를 남길 수 있다. 댓글이 붙은 텍스트가 편집 중 일부라도 남아 있으면 댓글 표시가 유지되고, 해당 범위가 전부 삭제되면 댓글 anchor도 함께 사라진다.

## Current Architecture

- 게시글 본문은 `posts.content`의 `LONGTEXT` 한 칼럼에 문자열로 저장된다.
- `posts.content_type`은 현재 `MARKDOWN`, `CANVAS`를 구분한다.
- `MARKDOWN` 글은 원문 Markdown 문자열로 저장되고 `renderMarkdown()`으로 렌더링된다.
- `CANVAS` 글은 Canvas JSON 문자열로 저장되고 Canvas renderer/editor가 처리한다.
- 하단 일반 댓글은 `post_comments` 테이블, `PostComment` 도메인, `/posts/{postId}/comments` API로 관리된다.
- 현재 댓글 모델에는 본문 선택 범위, anchor id, 문서 mark, range 복구 정보가 없다.

## Architecture Decision

문장 댓글은 기존 Markdown offset 기반으로 구현하지 않는다. Rilog에 `RICH_TEXT` content type을 추가하고, `RICH_TEXT` 글은 ProseMirror document JSON을 `posts.content`에 저장한다.

댓글이 달린 본문 범위는 ProseMirror `annotation` mark로 표현한다. 실제 댓글 스레드 데이터는 본문 JSON 안에 넣지 않고 별도 테이블에 저장한다. 본문 JSON은 댓글 위치를 안정적으로 들고, DB 테이블은 작성자, 댓글 내용, 권한과 생명주기를 담당한다.

기존 `post_comments`는 하단 일반 댓글로 유지한다. 문장 댓글은 `post_annotations`, `post_annotation_comments`를 새로 만들어 분리한다.

## Content Types

`PostContentType`은 다음 값을 가진다.

- `MARKDOWN`: 기존 Markdown 원문 저장
- `CANVAS`: 기존 Canvas JSON 저장
- `RICH_TEXT`: ProseMirror document JSON 저장

기존 Markdown 글과 Canvas 글은 마이그레이션하지 않는다. 1차 구현에서 문장 댓글은 `RICH_TEXT` 글에만 지원한다.

## ProseMirror Document Model

`RICH_TEXT` 본문은 ProseMirror JSON으로 저장한다.

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "댓글이 달린 문장",
          "marks": [
            {
              "type": "annotation",
              "attrs": {
                "id": "ann_123"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

`annotation` mark 속성은 다음을 가진다.

- `id`: `post_annotations.id`를 가리키는 안정적인 문자열 또는 숫자 문자열

동일 annotation id를 가진 mark가 여러 text node로 쪼개질 수 있다. 렌더러와 정리 로직은 같은 id를 하나의 anchor로 취급한다.

## Database Model

하단 댓글은 기존 `post_comments`를 유지한다.

문장 댓글 anchor:

```text
post_annotations
- id BIGINT
- post_id BIGINT
- author_id BIGINT
- quoted_text VARCHAR(500)
- status VARCHAR(20)   // ACTIVE, DELETED
- created_at DATETIME(6)
- updated_at DATETIME(6)
```

문장 댓글 스레드의 실제 메시지:

```text
post_annotation_comments
- id BIGINT
- annotation_id BIGINT
- user_id BIGINT
- content VARCHAR(1000)
- created_at DATETIME(6)
- updated_at DATETIME(6)
```

`quoted_text`는 표시와 회귀 확인용 snapshot이다. anchor 복구의 주 수단은 `quoted_text` 검색이 아니라 ProseMirror mark다.

## Anchor Lifecycle

문장 댓글 생성:

1. 사용자가 `RICH_TEXT` 글 상세 또는 편집 화면에서 텍스트 범위를 선택한다.
2. 클라이언트가 annotation 생성 API를 호출해 `post_annotations` row를 만든다.
3. 첫 댓글 내용을 `post_annotation_comments`에 저장한다.
4. 클라이언트가 선택 범위에 `annotation` mark를 적용한다.
5. 저장 시 `posts.content`에 annotation mark가 포함된 ProseMirror JSON을 저장한다.

글 수정 저장:

1. 서버는 저장 요청의 ProseMirror JSON에서 남아 있는 annotation id 목록을 추출한다.
2. DB의 `ACTIVE` annotation 중 문서에 더 이상 존재하지 않는 id는 `DELETED`로 바꾼다.
3. 문서에 한 글자라도 mark가 남은 annotation은 `ACTIVE`로 유지한다.

이 규칙으로 다음 Notion식 동작을 만든다.

- 댓글 달린 범위 전체가 삭제되면 annotation mark가 문서에서 사라지고 댓글도 비활성화된다.
- 댓글 달린 범위 중 한 글자라도 남으면 annotation mark가 남아 댓글 표시가 유지된다.

## API

기존 하단 댓글 API는 유지한다.

```text
GET    /posts/{postId}/comments
POST   /posts/{postId}/comments
DELETE /posts/{postId}/comments/{commentId}
```

문장 댓글 API를 추가한다.

```text
GET    /posts/{postId}/annotations
POST   /posts/{postId}/annotations
POST   /posts/{postId}/annotations/{annotationId}/comments
DELETE /posts/{postId}/annotations/{annotationId}/comments/{commentId}
```

`POST /posts/{postId}/annotations` 요청:

```json
{
  "quotedText": "댓글이 달린 문장",
  "content": "여기에 메모"
}
```

응답:

```json
{
  "id": 123,
  "quotedText": "댓글이 달린 문장",
  "comments": [
    {
      "id": 1,
      "content": "여기에 메모"
    }
  ]
}
```

## Frontend Behavior

`RICH_TEXT` 상세 화면은 ProseMirror JSON을 읽기용 HTML로 렌더링한다. `annotation` mark는 `data-annotation-id`가 붙은 inline element로 렌더링한다.

로그인 사용자가 본문 텍스트를 선택하면 문장 댓글 popover를 띄운다. 저장 후 해당 범위가 강조되고, 클릭하면 오른쪽 또는 인접 popover에서 스레드를 보여준다.

기존 Markdown 글과 Canvas 글에서는 1차 구현에서 문장 댓글 UI를 숨긴다.

## SEO

저장은 ProseMirror JSON이어도 읽기 화면은 semantic HTML로 렌더링한다. 본문 텍스트는 실제 DOM 텍스트로 노출되어야 하며 canvas나 이미지로만 표현하지 않는다.

초기 구현은 현재 SPA 렌더링 방식을 따른다. 검색 최적화를 더 강화하는 단계에서는 서버에서 `RICH_TEXT` JSON을 HTML로 변환해 최초 응답에 포함하는 방식을 추가할 수 있다.

## Error Handling

- `RICH_TEXT`가 아닌 글에 문장 댓글 생성 요청이 오면 400 응답을 반환한다.
- 존재하지 않거나 삭제된 annotation에 댓글을 추가하면 404 응답을 반환한다.
- 비공개 글은 작성자만 annotation 조회와 생성을 할 수 있다.
- 댓글 삭제 권한은 기존 하단 댓글과 동일하게 댓글 작성자 또는 게시글 작성자에게 준다.
- 저장 요청의 ProseMirror JSON이 유효하지 않으면 400 응답을 반환한다.

## Testing

백엔드 테스트:

- `RICH_TEXT` content type 저장과 응답
- annotation 생성과 첫 댓글 저장
- 하단 일반 댓글 API가 기존대로 유지되는지
- `RICH_TEXT` 글 저장 시 문서에 없는 annotation이 `DELETED`로 바뀌는지
- mark가 하나라도 남아 있는 annotation은 유지되는지
- `MARKDOWN`, `CANVAS` 글에는 문장 댓글 생성이 거절되는지

프론트엔드 테스트:

- ProseMirror JSON에서 annotation id를 추출한다.
- annotation mark를 HTML로 렌더링한다.
- 같은 annotation id가 여러 text node에 있어도 하나의 스레드로 묶는다.
- 선택 범위 댓글 생성 후 mark id가 문서에 들어간다.

## Non-Goals

- 기존 Markdown 글 전체를 자동으로 ProseMirror JSON으로 마이그레이션하지 않는다.
- Canvas node 안의 텍스트에 문장 댓글을 붙이지 않는다.
- offset과 content hash를 주 anchor 모델로 사용하지 않는다.
- 서버사이드 SEO 렌더링은 1차 구현 범위에 넣지 않는다.
