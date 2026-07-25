# Rilog ProseMirror Block Editor Design

## Goal

Rilog의 Markdown 글 작성 화면을 좌우 분할 원문·미리보기 방식에서 단일 WYSIWYG 블록 편집기로 변경한다.

사용자는 Markdown 제어 문자를 계속 보지 않고 게시글 상세 화면과 거의 같은 타이포그래피에서 직접 글을 작성한다. 서버에는 기존과 같은 Markdown 문자열을 저장하며 기존 게시글, 게시 API, 이미지 업로드 API와의 호환성을 유지한다.

## Current Architecture

- `index.html`은 SPA 셸만 제공하고 `app.js`가 글 작성 화면을 동적으로 생성한다.
- `renderEditor()`는 제목, Markdown `textarea`, 썸네일, 공개 상태와 하단 작업 버튼을 구성한다.
- `createMarkdownEditor()`는 툴바와 Markdown 원문·미리보기 분할 화면을 만든다.
- Markdown 상태는 별도 모델 없이 `textarea.value`에 저장된다.
- `markdown-editor.js`는 문자열 기반 단축키, 자동완성, 자동 쌍 입력과 표 변환을 담당한다.
- `markdown.js`의 `renderMarkdown()`은 작성 미리보기와 게시글 상세 화면에서 함께 사용된다.
- `api.js`는 기존 `POST /posts`, `PUT /posts/{id}`, `POST /images` 호출을 담당한다.
- 서버는 Markdown 원문을 `Post.content`에 저장하며 서버 측 Markdown 렌더링은 하지 않는다.

## Architecture Decision

기존 Spring Boot, 해시 라우팅 SPA와 Vanilla JavaScript 화면 구조는 유지한다. 글 작성 화면에만 ProseMirror 코어와 필요한 공식 모듈을 도입하고 정적 브라우저 번들로 빌드한다.

Tiptap 같은 상위 편집기 프레임워크나 완제품 Markdown 편집기는 사용하지 않는다. ProseMirror 스키마, 상태와 트랜잭션을 직접 구성해 프로젝트 전용 토글, 콜아웃, 이미지 업로드와 Markdown 저장 형식을 제어한다.

## Module Boundaries

편집기 소스는 `src/main/frontend/editor/` 아래에 두고 하나의 대형 파일에 모으지 않는다. 다음 파일과 책임 경계를 사용한다.

- `block-editor.js`: 공개 생성 API, `EditorState`와 `EditorView` 생명주기, 외부 폼 연동
- `block-editor-schema.js`: 노드, mark, 허용 속성과 콘텐츠 관계
- `block-editor-markdown.js`: Markdown 파싱과 직렬화
- `block-editor-input-rules.js`: Markdown 자동 변환과 기존 단축키
- `block-editor-slash-menu.js`: 명령 검색, 위치, 키보드와 마우스 상호작용
- `block-editor-table.js`: 표 생성, 행·열 조작과 셀 이동
- `block-editor-image.js`: 파일 선택·붙여넣기, 업로드 상태와 이미지 노드 삽입
- `block-editor-toolbar.js`: 유지되는 서식 버튼과 선택 영역 복원

`app.js`는 편집기 내부를 직접 조작하지 않는다. 초기 Markdown, 변경 콜백, 이미지 업로드 함수만 전달하고 저장 시 직렬화된 Markdown을 받는다.

## Document Model

ProseMirror 문서는 최소한 다음 블록 노드를 지원한다.

- `paragraph`
- `heading` 1~6
- `bullet_list`, `ordered_list`, `list_item`
- `blockquote`
- `horizontal_rule`
- `code_block`
- `toggle`
- `callout`
- `table`, `table_row`, `table_header`, `table_cell`
- `image`

인라인 mark는 다음을 지원한다.

- 굵게
- 기울임
- 밑줄
- 취소선
- 인라인 코드
- 링크
- 검증된 글자 색상

편집 가능한 블록은 고유 ID 속성을 갖는다. ID는 DOM 추적과 편집 세션의 안정성에 사용한다. Markdown 저장 형식에 ID가 필요한 확장 블록이 아니라면 ID를 저장 문자열에 노출하지 않는다. Markdown을 다시 불러올 때 ID가 없는 블록에는 새 ID를 할당한다.

## Data Flow

새 글은 빈 ProseMirror 문서로 시작한다. 기존 글은 저장된 Markdown을 파싱해 ProseMirror 문서 상태로 만든다.

```text
saved Markdown
  -> Markdown parser
  -> ProseMirror document
  -> EditorState / EditorView
  -> user transactions
  -> Markdown serializer
  -> existing draft and post APIs
```

편집 중에는 ProseMirror 트랜잭션으로 변경된 DOM만 갱신한다. 입력마다 편집 영역 전체를 재렌더링하지 않는다. `EditorView`가 커서, 선택 영역, IME 조합과 Undo/Redo 기록을 관리한다.

임시저장과 발행은 기존 흐름을 유지한다. Markdown 편집기의 현재 직렬화 결과를 `content`로 전달하고 기존 summary 생성, 썸네일, 공개 상태와 API 계약은 변경하지 않는다.

## Markdown Compatibility

일반 블록은 기존 표준 Markdown 형식을 유지한다.

- 제목: `#`~`######`
- 목록: `-`, `1.`
- 인용: `>`
- 구분선: `---`
- 코드 블록: fenced code block과 언어 토큰
- 표: 기존 파이프 표
- 이미지: `![alt](url)`
- 인라인 서식: 기존 renderer가 지원하는 Markdown/검증된 HTML 표현

토글은 기존 renderer가 이미 지원하는 가역적인 `details`/`summary` 형식을 사용한다.

```html
<details>
<summary>토글 제목</summary>

내부 Markdown

</details>
```

콜아웃은 현재 작업 중인 Obsidian 호환 형식을 보존한다.

```md
> [!note] 안내
> 중요한 내용입니다.
```

기존 Markdown을 읽고 다시 저장했을 때 지원 범위의 의미와 구조가 보존되어야 한다. 파서가 이해하지 못하는 입력은 조용히 삭제하지 않고 일반 텍스트 또는 호환 가능한 원시 블록으로 보존한다.

## Keyboard and Input Compatibility

현재 동작하는 단축키와 자동완성은 필수 회귀 방지 대상이다. 문자열 변환 방식만 ProseMirror command, keymap과 input rule로 교체한다.

- `#`~`######` + Space: 제목 1~6
- `-` 또는 `*` + Space: 글머리 목록
- `1.` + Space: 번호 목록
- `>` + Space: 인용문
- `---` + Enter: 구분선과 다음 문단
- 백틱 한 개: 인라인 코드
- 백틱 세 개: 코드 블록
- Cmd/Ctrl+B: 굵게
- Cmd/Ctrl+I: 기울임
- Cmd/Ctrl+U: 밑줄
- Cmd/Ctrl+E: 인라인 코드
- Cmd/Ctrl+K: 링크
- Cmd/Ctrl+Shift+X: 취소선
- Cmd/Ctrl+Shift+7: 번호 목록
- Cmd/Ctrl+Shift+8: 글머리 목록
- Cmd/Ctrl+Shift+9: 인용문
- Cmd/Ctrl+Option+1~6: 제목 단계
- Tab/Shift+Tab: 목록 들여쓰기·내어쓰기, 코드 블록에서는 들여쓰기 문자 입력
- 괄호, 대괄호, 중괄호, 따옴표와 백틱 자동 쌍 입력
- 이미 존재하는 닫는 문자 건너뛰기와 빈 자동 쌍 Backspace 삭제
- 목록 Enter 시 다음 항목 생성, 빈 항목 Enter 시 목록 종료
- 빈 제목·인용·목록에서 Backspace 시 일반 문단 복귀

`compositionstart`부터 `compositionend`까지 Markdown input rule과 Slash Command 실행을 보류한다. 한글 조합 완료 전 중복 입력이나 오작동이 없어야 한다.

## Slash Command Menu

빈 문단 또는 문단 시작 위치의 `/`만 명령 시작으로 인식한다. URL이나 일반 문장 중간의 `/`에는 열지 않는다.

메뉴는 다음 동작을 지원한다.

- `/`에서 전체 목록 표시
- 영문 명령과 한글 이름·설명 검색
- 입력에 따른 필터링
- 위·아래 방향키 탐색
- Enter 및 마우스 클릭 선택
- Esc 및 바깥 클릭 닫기
- 검색 결과가 없을 때 빈 상태
- 커서 좌표 기준 배치와 화면 경계 보정
- 실행 시 `/command` 범위 삭제
- 생성된 블록의 첫 편집 위치로 커서 이동
- IME 조합 중 검색과 실행 보류

초기 명령은 다음과 같다.

- `/toggle`: 제목과 내부 블록을 가진 접기/펼치기 노드
- `/callout`: 아이콘, 유형과 내부 블록을 가진 강조 노드
- `/table`: 2열 2행 표, 생성 직후 첫 셀 선택
- `/image`: 기존 `/images` 업로드 흐름 실행
- `/code`: 코드 블록 생성 후 내부 선택

## Special Block Behavior

### Toggle

토글 제목과 내부 콘텐츠는 분리된 편집 영역이다. 내부는 여러 일반 블록, 목록과 코드 블록을 포함할 수 있다. 화살표로 열고 닫으며 상세 화면에서도 동일한 `details` 동작을 유지한다.

### Callout

콜아웃은 아이콘, 유형, 제목과 블록 콘텐츠를 가진다. 기존 작업 중인 `.markdown-callout` 스타일과 `markdown.js` 렌더링 변경을 보존해 작성 화면과 상세 화면의 표현을 맞춘다.

### Table

기본 표는 2열 2행이다. 첫 행은 헤더로 사용한다. Tab과 Shift+Tab으로 셀을 이동하고 마지막 셀에서 Tab을 누르면 행을 추가한다. 행·열 추가 컨트롤은 표가 선택된 동안에만 표시한다.

### Image

파일 선택과 클립보드 붙여넣기는 기존 `POST /images` API를 사용한다. 업로드 동안 임시 이미지 노드에 진행 상태를 표시한다. 성공하면 URL과 편집 가능한 대체 텍스트를 가진 이미지 노드로 전환한다. 실패하면 오류와 재시도·삭제 동작을 제공한다.

연속된 이미지 직렬화는 기존 이미지 그리드 렌더링을 깨뜨리지 않도록 연속 Markdown 이미지로 저장한다. 상세 화면의 이미지 확대 동작도 유지한다.

### Code Block

코드 내용은 실행 가능한 HTML이 아니라 텍스트로만 취급한다. 기존 언어 토큰과 클래스 렌더링을 보존한다. Tab은 포커스를 이동하지 않고 코드 들여쓰기로 동작한다.

## Toolbar and Layout

기존 좌우 분할 화면과 다음 표시는 제거한다.

- Markdown 원문 textarea
- 작성·미리보기 구분선
- `작성`, `미리보기`, `Markdown` 레이블
- 두 패널의 독립 스크롤

제목 아래에는 툴바와 단일 편집 영역을 둔다. 편집 영역은 상세 화면의 `.markdown-body` 타이포그래피와 콘텐츠 스타일을 최대한 재사용한다.

Slash Command와 중복되는 토글, 표, 이미지, 코드 블록 삽입 버튼은 툴바에서 제거한다. 제목 1~6, 굵게, 기울임, 밑줄, 취소선, 인라인 코드, 인용, 링크, 글자 색상은 유지한다.

툴바의 `mousedown`에서 편집기 선택 영역을 보존하고 command 실행 후 편집기로 포커스를 복원한다. 모바일에서는 툴바를 가로 스크롤할 수 있게 하고 편집 영역은 단일 열로 유지한다.

하단의 나가기, 임시저장과 발행 동작은 현재 구조를 유지한다.

## Security and Paste Handling

- 붙여넣은 HTML은 ProseMirror 스키마에 허용된 노드, mark와 속성만 파싱한다.
- `script`, 이벤트 핸들러, 임의 스타일과 위험한 태그를 제거한다.
- 링크와 이미지 URL은 기존 허용 프로토콜 정책을 유지한다.
- 글자 색상은 현재처럼 검증된 hex 값만 허용한다.
- 코드 블록의 HTML은 실행하지 않고 텍스트로 보존한다.
- 상세 화면은 계속 DOM 생성과 `textContent` 중심의 기존 sanitizer 정책을 사용한다.

## Error Handling

- 초기 Markdown 파싱 실패 시 사용자 콘텐츠를 삭제하지 않고 안전한 일반 텍스트 편집 상태를 제공한다.
- 이미지 업로드 오류는 편집 중인 다른 콘텐츠나 선택 기록을 잃지 않고 해당 노드에만 표시한다.
- 직렬화 오류가 발생하면 발행을 중단하고 복구 가능한 오류 메시지를 표시한다.
- 기존 draft가 잘못됐거나 너무 오래된 형식이어도 원문을 보존해 다시 편집할 수 있게 한다.

## Build Integration

프런트엔드 번들링은 편집기 모듈에만 적용한다. 기존 Spring Boot 정적 리소스 배포와 SPA 진입점은 유지한다. 번들러는 설정이 작은 `esbuild`를 사용한다.

- `package.json`에 사용하는 ProseMirror 모듈과 `esbuild` 버전을 고정한다.
- 편집기 소스는 `src/main/frontend/editor/`, 생성 번들은 `src/main/resources/static/js/block-editor.bundle.js`로 분리한다.
- 개발·테스트·프로덕션 빌드 명령을 문서화한다.
- Spring Boot가 생성된 브라우저 번들을 `/js/` 정적 리소스로 제공한다.
- 전체 앱을 React, Vue 또는 다른 프레임워크로 전환하지 않는다.
- Spring Boot만 실행해도 현재와 동일하게 앱이 열리도록 생성 번들을 저장소에 포함한다.
- 테스트와 검증 단계에서 번들을 다시 생성하고 커밋된 결과와 일치하는지 확인한다.

## Testing Strategy

### Unit Tests

- Markdown parser가 기존 Markdown과 확장 블록을 올바른 노드로 변환
- serializer가 노드를 기존 호환 Markdown으로 변환
- parse → serialize → parse 왕복 시 의미와 구조 보존
- 모든 기존 키보드 단축키 command
- 제목·목록·인용·구분선·코드 input rule
- 목록 Enter, 빈 목록 종료와 Backspace 해제
- 자동 쌍 입력과 건너뛰기
- Slash 검색, 키보드 선택, 실행과 명령 문자열 제거
- 표 생성, 셀 이동과 행·열 추가
- 위험한 HTML과 URL 제거

### DOM and Integration Tests

- 툴바 클릭 후 선택 영역 유지
- 트랜잭션 후 커서 위치 유지
- 브라우저 Undo/Redo
- IME 조합 중 input rule과 Slash Command 미실행
- 이미지 붙여넣기와 성공·실패 상태
- 기존 draft 로드와 Markdown 발행 payload
- 기존 게시글 수정 후 상세 렌더링 호환

### Existing Regression Tests

기존 `markdown.test.mjs`와 `markdown-editor.test.mjs`의 의도를 삭제하지 않는다. 더 이상 사용하지 않는 textarea 전용 구현 테스트는 동일한 사용자 동작을 검증하는 ProseMirror 테스트로 대체한 뒤에만 제거한다.

현재 미커밋된 콜아웃 renderer, CSS와 테스트 변경은 사용자 소유 변경으로 취급하고 새 구현에 통합한다.

### Browser Verification

- 데스크톱과 모바일 단일 편집 화면
- 한글 입력과 조합
- 키보드만 사용한 작성과 Slash Command
- 긴 문서 스크롤
- 토글, 콜아웃, 표, 이미지와 코드 블록 작성·저장·재편집
- 상세 화면과 작성 화면의 시각적 일치

## Implementation Sequence

1. npm과 번들러의 최소 구성 및 ProseMirror 테스트 환경 구축
2. Rilog 스키마와 Markdown parser/serializer를 테스트 우선으로 구현
3. 단일 ProseMirror 편집 영역을 기존 폼에 연결
4. 기존 단축키, 자동완성, 자동 쌍 입력과 IME 방어 구현
5. 유지되는 툴바 command와 선택 영역 보존 구현
6. Slash Command 메뉴와 `/code`, `/table` 구현
7. 토글과 콜아웃 노드 및 Markdown 왕복 구현
8. 기존 이미지 API를 이용한 업로드·붙여넣기·대체 텍스트 구현
9. 분할 화면 제거와 상세 화면 타이포그래피 기반 스타일 적용
10. 기존 renderer의 토글·콜아웃·이미지 그리드 호환 통합
11. 단위·DOM·브라우저 회귀 테스트와 빌드 검증

## Risks and Mitigations

- 기존 renderer와 새 serializer가 다른 Markdown 방언을 만들 수 있다. 기존 fixture를 parser/serializer 양쪽의 호환 계약으로 재사용한다.
- ProseMirror에서 토글 내부 중첩 블록 스키마가 복잡해질 수 있다. 토글 제목과 콘텐츠의 허용 관계를 스키마로 제한하고 독립 테스트한다.
- 한글 IME 이벤트 순서는 브라우저별로 다를 수 있다. composition 상태를 명시적으로 추적하고 실제 브라우저 검증을 수행한다.
- 번들링이 기존 단순 배포를 깨뜨릴 수 있다. 편집기만 번들링하고 Gradle의 정적 리소스 결과를 별도로 검증한다.
- 사용자 미커밋 콜아웃 변경과 같은 파일을 수정해야 한다. 해당 변경을 기준선으로 보존하고 작은 패치와 회귀 테스트로 통합한다.

## Acceptance Criteria

- 글 작성 화면에 원문·미리보기 분할 없이 단일 블록 편집 영역만 보인다.
- 작성 화면의 블록 표현이 게시글 상세 화면과 실질적으로 동일하다.
- 기존 Markdown 게시글을 열고 수정·저장해도 지원되는 구조와 의미가 보존된다.
- 현재 정상 동작하는 모든 Markdown 단축키와 자동완성이 동일한 사용자 결과를 제공한다.
- Markdown 제어 문자는 변환 후 화면에 지속적으로 노출되지 않는다.
- 목록 Enter/Backspace, 커서 이동, 선택 영역과 Undo/Redo가 자연스럽게 동작한다.
- 한글 IME 조합 중 중복 입력이나 잘못된 명령 실행이 발생하지 않는다.
- Slash Command의 검색, 키보드·마우스 선택, 닫기, 위치 보정과 빈 상태가 동작한다.
- 토글, 콜아웃, 표, 이미지와 코드 블록을 작성·저장·재편집할 수 있다.
- 기존 `/images`, `/posts` API와 Markdown 상세 renderer를 계속 사용한다.
- 붙여넣기와 저장 콘텐츠가 기존 XSS 방어 수준을 유지한다.
- 기존 및 새 JavaScript 테스트와 관련 Gradle 테스트가 통과한다.

## Out of Scope

- 전체 SPA를 React, Vue 또는 다른 프런트엔드 프레임워크로 이전
- 실시간 공동 편집
- 댓글이나 Canvas 편집기 변경
- 게시 API나 데이터베이스 저장 형식 교체
- 임의 HTML을 완전하게 보존하는 범용 HTML 편집기
- Notion 전체 기능이나 플러그인 생태계 복제
