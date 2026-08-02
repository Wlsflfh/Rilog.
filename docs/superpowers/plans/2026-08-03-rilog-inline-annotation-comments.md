# Rilog Inline Annotation Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Notion-style inline sentence comments for `RICH_TEXT` posts while preserving existing bottom `post_comments`.

**Architecture:** Add `RICH_TEXT` as a third `PostContentType` whose `posts.content` stores ProseMirror JSON. Store inline comment anchors in `post_annotations`, store thread messages in `post_annotation_comments`, and treat ProseMirror `annotation` marks as the source of truth for whether an anchor still exists after edits.

**Tech Stack:** Java 21, Spring Boot 3.3.5, Spring Data JPA, Jackson `ObjectMapper`, Vanilla ES modules, ProseMirror core modules bundled with esbuild, Node test runner.

## Global Constraints

- Existing `post_comments` APIs and behavior remain unchanged.
- Existing `MARKDOWN` and `CANVAS` post storage remains unchanged.
- Inline annotation comments are supported only for `RICH_TEXT` posts in the first implementation.
- `posts.content` remains the single post body column; no duplicate Markdown and Rich Text body storage.
- Annotation liveness is determined by ProseMirror `annotation` marks, not by offset, hash, or `quotedText` search.
- If an annotation mark disappears entirely from the saved ProseMirror JSON, the matching `post_annotations` row becomes `DELETED`.
- If at least one text node still has the annotation mark, the matching `post_annotations` row remains `ACTIVE`.
- Use `apply_patch` for manual edits and keep unrelated dirty worktree changes intact.

---

## File Structure

- Modify `src/main/java/blog/domain/PostContentType.java`: add `RICH_TEXT`.
- Modify `src/main/resources/schema.sql`: add annotation tables and indexes.
- Create `src/main/java/blog/domain/PostAnnotationStatus.java`: `ACTIVE`, `DELETED`.
- Create `src/main/java/blog/domain/PostAnnotation.java`: inline anchor aggregate.
- Create `src/main/java/blog/domain/PostAnnotationComment.java`: inline thread message aggregate.
- Create `src/main/java/blog/repository/PostAnnotationRepository.java`: annotation lookup and counting queries.
- Create `src/main/java/blog/repository/PostAnnotationCommentRepository.java`: thread comment lookup.
- Create `src/main/java/blog/controller/dto/AnnotationRequest.java`: create annotation request.
- Create `src/main/java/blog/controller/dto/AnnotationCommentRequest.java`: add thread comment request.
- Create `src/main/java/blog/controller/dto/AnnotationCommentResponse.java`: thread comment response.
- Create `src/main/java/blog/controller/dto/AnnotationResponse.java`: annotation response.
- Create `src/main/java/blog/service/RichTextAnnotationExtractor.java`: parse ProseMirror JSON and extract `annotation` mark ids.
- Create `src/main/java/blog/service/PostAnnotationService.java`: inline annotation business logic.
- Modify `src/main/java/blog/service/PostCommandService.java`: call cleanup after `RICH_TEXT` update.
- Modify `src/main/java/blog/controller/PostController.java`: add `/annotations` endpoints.
- Modify `src/main/resources/static/js/api.js`: add annotation API functions.
- Create `src/main/resources/static/js/rich-text.js`: ProseMirror-shaped JSON renderer and annotation helpers.
- Modify `src/main/resources/static/js/app.js`: add `RICH_TEXT` rendering and detail annotation UI.
- Modify `src/main/resources/static/css/styles.css`: add inline annotation highlight and popover styles.
- Create `src/test/java/blog/service/RichTextAnnotationExtractorTest.java`.
- Create `src/test/java/blog/service/PostAnnotationServiceTest.java`.
- Modify `src/test/java/blog/service/PostCommandServiceTest.java`.
- Modify `src/test/java/blog/auth/config/AuthSecurityIntegrationTest.java`.
- Create `src/test/js/rich-text.test.mjs`.

---

## Task 1: Rich Text Type and Annotation Mark Extraction

**Files:**
- Modify: `src/main/java/blog/domain/PostContentType.java`
- Create: `src/main/java/blog/service/RichTextAnnotationExtractor.java`
- Test: `src/test/java/blog/service/RichTextAnnotationExtractorTest.java`
- Modify: `src/test/java/blog/service/PostCommandServiceTest.java`

**Interfaces:**
- Produces: `PostContentType.RICH_TEXT`
- Produces: `RichTextAnnotationExtractor.extractAnnotationIds(String content): Set<Long>`
- Produces: `RichTextAnnotationExtractor.validate(String content): void`
- Consumes later: `PostCommandService` and `PostAnnotationService` use extracted ids for cleanup.

- [ ] **Step 1: Write the failing extractor test**

Add `src/test/java/blog/service/RichTextAnnotationExtractorTest.java`:

```java
package blog.service;

import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RichTextAnnotationExtractorTest {

    private final RichTextAnnotationExtractor extractor = new RichTextAnnotationExtractor();

    @Test
    @DisplayName("ProseMirror JSON에서 annotation mark id를 중복 없이 추출한다.")
    void extractAnnotationIds() {
        String content = """
                {
                  "type": "doc",
                  "content": [
                    {
                      "type": "paragraph",
                      "content": [
                        {
                          "type": "text",
                          "text": "댓글",
                          "marks": [
                            {"type": "annotation", "attrs": {"id": "1"}},
                            {"type": "strong"}
                          ]
                        },
                        {
                          "type": "text",
                          "text": " 유지",
                          "marks": [
                            {"type": "annotation", "attrs": {"id": 1}},
                            {"type": "annotation", "attrs": {"id": "2"}}
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;

        assertThat(extractor.extractAnnotationIds(content)).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    @DisplayName("유효하지 않은 Rich Text JSON은 거절한다.")
    void rejectInvalidJson() {
        assertThatThrownBy(() -> extractor.validate("{"))
                .isInstanceOf(BlogException.class)
                .extracting("code")
                .isEqualTo(DomainErrorCode.INVALID_INPUT);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'blog.service.RichTextAnnotationExtractorTest'
```

Expected: FAIL because `RichTextAnnotationExtractor` does not exist.

- [ ] **Step 3: Implement `RICH_TEXT` enum value**

Modify `src/main/java/blog/domain/PostContentType.java`:

```java
package blog.domain;

public enum PostContentType {
    MARKDOWN,
    CANVAS,
    RICH_TEXT
}
```

- [ ] **Step 4: Implement extractor**

Create `src/main/java/blog/service/RichTextAnnotationExtractor.java`:

```java
package blog.service;

import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Set;

@Component
public class RichTextAnnotationExtractor {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Set<Long> extractAnnotationIds(String content) {
        JsonNode root = parse(content);
        Set<Long> ids = new LinkedHashSet<>();
        collect(root, ids);
        return ids;
    }

    public void validate(String content) {
        parse(content);
    }

    private JsonNode parse(String content) {
        try {
            JsonNode root = objectMapper.readTree(content);
            if (root == null || !"doc".equals(root.path("type").asText())) {
                throw invalid();
            }
            return root;
        } catch (BlogException exception) {
            throw exception;
        } catch (Exception exception) {
            throw invalid();
        }
    }

    private void collect(JsonNode node, Set<Long> ids) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }
        JsonNode marks = node.get("marks");
        if (marks != null && marks.isArray()) {
            for (JsonNode mark : marks) {
                if ("annotation".equals(mark.path("type").asText())) {
                    Long id = idOf(mark.path("attrs").path("id"));
                    if (id != null) {
                        ids.add(id);
                    }
                }
            }
        }
        JsonNode content = node.get("content");
        if (content != null && content.isArray()) {
            for (JsonNode child : content) {
                collect(child, ids);
            }
        }
    }

    private Long idOf(JsonNode idNode) {
        if (idNode == null || idNode.isMissingNode() || idNode.isNull()) {
            return null;
        }
        try {
            if (idNode.isNumber()) {
                return idNode.asLong();
            }
            String value = idNode.asText();
            return value == null || value.isBlank() ? null : Long.parseLong(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private BlogException invalid() {
        return new BlogException(DomainErrorCode.INVALID_INPUT, "Rich Text 본문 형식이 올바르지 않습니다.");
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'blog.service.RichTextAnnotationExtractorTest'
```

Expected: PASS.

- [ ] **Step 6: Add post command test for Rich Text acceptance**

Add to `src/test/java/blog/service/PostCommandServiceTest.java`:

```java
@Test
@DisplayName("Rich Text 글을 작성하면 글 타입을 함께 저장한다.")
void createRichTextPost() {
    User user = new User("방문자", "visitor@example.com", null);
    Post saved = mock(Post.class);
    given(saved.getId()).willReturn(1L);
    given(userService.getUser(1L)).willReturn(user);
    given(slugGenerator.generate(1L, "제목")).willReturn("title");
    given(postRepository.save(any(Post.class))).willReturn(saved);
    PostRequest request = new PostRequest(
            "제목",
            "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"본문\"}]}]}",
            null,
            null,
            PostContentType.RICH_TEXT,
            PostCategory.IT,
            PostStatus.PUBLIC
    );

    postCommandService.create(1L, request);

    ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
    verify(postRepository).save(captor.capture());
    assertThat(captor.getValue().getContentType()).isEqualTo(PostContentType.RICH_TEXT);
}
```

- [ ] **Step 7: Run command service test**

Run:

```bash
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'blog.service.PostCommandServiceTest'
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/blog/domain/PostContentType.java src/main/java/blog/service/RichTextAnnotationExtractor.java src/test/java/blog/service/RichTextAnnotationExtractorTest.java src/test/java/blog/service/PostCommandServiceTest.java
git commit -m "feat: add rich text annotation extraction"
```

---

## Task 2: Annotation Domain, Schema, and Repositories

**Files:**
- Modify: `src/main/resources/schema.sql`
- Create: `src/main/java/blog/domain/PostAnnotationStatus.java`
- Create: `src/main/java/blog/domain/PostAnnotation.java`
- Create: `src/main/java/blog/domain/PostAnnotationComment.java`
- Create: `src/main/java/blog/repository/PostAnnotationRepository.java`
- Create: `src/main/java/blog/repository/PostAnnotationCommentRepository.java`
- Test: `src/test/java/blog/service/PostAnnotationServiceTest.java`

**Interfaces:**
- Produces: `PostAnnotation.markDeleted(): void`
- Produces: `PostAnnotation.isActive(): boolean`
- Produces: `PostAnnotationComment(PostAnnotation annotation, User user, String content)`
- Produces: `PostAnnotationRepository.findByPostIdAndStatusOrderByCreatedAtAsc(Long postId, PostAnnotationStatus status)`
- Produces: `PostAnnotationRepository.findByIdAndPostId(Long id, Long postId)`
- Produces: `PostAnnotationRepository.findByPostIdAndStatus(Long postId, PostAnnotationStatus status)`
- Produces: `PostAnnotationCommentRepository.findByAnnotationIdOrderByCreatedAtAsc(Long annotationId)`

- [ ] **Step 1: Write the failing domain/service skeleton test**

Create `src/test/java/blog/service/PostAnnotationServiceTest.java`:

```java
package blog.service;

import blog.controller.dto.AnnotationRequest;
import blog.domain.Post;
import blog.domain.PostAnnotation;
import blog.domain.PostAnnotationStatus;
import blog.domain.PostContentType;
import blog.domain.PostStatus;
import blog.domain.User;
import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import blog.repository.PostAnnotationCommentRepository;
import blog.repository.PostAnnotationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class PostAnnotationServiceTest {

    private final PostAnnotationRepository postAnnotationRepository = mock(PostAnnotationRepository.class);
    private final PostAnnotationCommentRepository postAnnotationCommentRepository = mock(PostAnnotationCommentRepository.class);
    private final PostFinder postFinder = mock(PostFinder.class);
    private final UserService userService = mock(UserService.class);
    private final PostAnnotationService service = new PostAnnotationService(
            postAnnotationRepository,
            postAnnotationCommentRepository,
            postFinder,
            userService
    );

    @Test
    @DisplayName("Rich Text 글에는 문장 댓글 anchor와 첫 댓글을 만들 수 있다.")
    void createAnnotation() {
        Post post = new Post(
                new User("작성자", "author@example.com", null),
                "제목",
                "{\"type\":\"doc\",\"content\":[]}",
                null,
                PostStatus.PUBLIC,
                "title",
                null,
                PostContentType.RICH_TEXT
        );
        User user = new User("방문자", "visitor@example.com", null);
        PostAnnotation saved = mock(PostAnnotation.class);
        given(saved.getId()).willReturn(1L);
        given(postFinder.find(1L)).willReturn(post);
        given(userService.getUser(2L)).willReturn(user);
        given(postAnnotationRepository.save(any(PostAnnotation.class))).willReturn(saved);

        service.create(1L, 2L, new AnnotationRequest("문장", "메모"));

        verify(postAnnotationRepository).save(any(PostAnnotation.class));
        verify(postAnnotationCommentRepository).save(any());
    }

    @Test
    @DisplayName("Markdown 글에는 문장 댓글을 만들 수 없다.")
    void rejectMarkdownPost() {
        Post post = new Post(new User("작성자", "author@example.com", null), "제목", "본문", null, PostStatus.PUBLIC);
        given(postFinder.find(1L)).willReturn(post);
        given(userService.getUser(2L)).willReturn(new User("방문자", "visitor@example.com", null));

        assertThatThrownBy(() -> service.create(1L, 2L, new AnnotationRequest("문장", "메모")))
                .isInstanceOf(BlogException.class)
                .extracting("code")
                .isEqualTo(DomainErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("문서에 남아 있지 않은 active annotation은 삭제 상태로 바꾼다.")
    void deleteMissingAnnotations() {
        PostAnnotation kept = mock(PostAnnotation.class);
        PostAnnotation removed = mock(PostAnnotation.class);
        given(kept.getId()).willReturn(1L);
        given(removed.getId()).willReturn(2L);
        given(postAnnotationRepository.findByPostIdAndStatus(10L, PostAnnotationStatus.ACTIVE))
                .willReturn(List.of(kept, removed));

        service.syncDeletedAnnotations(10L, java.util.Set.of(1L));

        verify(removed).markDeleted();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'blog.service.PostAnnotationServiceTest'
```

Expected: FAIL because annotation classes do not exist.

- [ ] **Step 3: Add schema tables**

Modify `src/main/resources/schema.sql`:

```sql
DROP TABLE IF EXISTS post_annotation_comments;
DROP TABLE IF EXISTS post_annotations;
```

Place those before `DROP TABLE IF EXISTS post_comments;`.

Add after `CREATE TABLE post_comments (...)`:

```sql
CREATE TABLE post_annotations (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    post_id       BIGINT       NOT NULL,
    author_id     BIGINT       NOT NULL,
    quoted_text   VARCHAR(500) NOT NULL,
    status        VARCHAR(20)  NOT NULL,
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT fk_post_annotations_post
        FOREIGN KEY (post_id)
            REFERENCES posts (id),

    CONSTRAINT fk_post_annotations_author
        FOREIGN KEY (author_id)
            REFERENCES users (id)
);

CREATE TABLE post_annotation_comments (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    annotation_id   BIGINT        NOT NULL,
    user_id         BIGINT        NOT NULL,
    content         VARCHAR(1000) NOT NULL,
    created_at      DATETIME(6)   NOT NULL,
    updated_at      DATETIME(6)   NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT fk_post_annotation_comments_annotation
        FOREIGN KEY (annotation_id)
            REFERENCES post_annotations (id),

    CONSTRAINT fk_post_annotation_comments_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
);
```

Add indexes near comment indexes:

```sql
CREATE INDEX idx_post_annotations_post_status_created_at ON post_annotations (post_id, status, created_at);
CREATE INDEX idx_post_annotations_author_id ON post_annotations (author_id);
CREATE INDEX idx_post_annotation_comments_annotation_created_at ON post_annotation_comments (annotation_id, created_at);
CREATE INDEX idx_post_annotation_comments_user_id ON post_annotation_comments (user_id);
```

- [ ] **Step 4: Add domain classes**

Create `src/main/java/blog/domain/PostAnnotationStatus.java`:

```java
package blog.domain;

public enum PostAnnotationStatus {
    ACTIVE,
    DELETED
}
```

Create `src/main/java/blog/domain/PostAnnotation.java`:

```java
package blog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static blog.domain.exception.DomainErrorCode.INVALID_INPUT;
import static blog.domain.exception.DomainPreconditions.requireNonBlank;
import static blog.domain.exception.DomainPreconditions.requireNonNull;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "post_annotations")
public class PostAnnotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, length = 500)
    private String quotedText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostAnnotationStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public PostAnnotation(Post post, User author, String quotedText) {
        this.post = requireNonNull(post, INVALID_INPUT, "게시글 정보는 비어있을 수 없습니다.");
        this.author = requireNonNull(author, INVALID_INPUT, "유저 정보는 비어있을 수 없습니다.");
        this.quotedText = requireNonBlank(quotedText, INVALID_INPUT, "선택한 문장은 비어있을 수 없습니다.");
        this.status = PostAnnotationStatus.ACTIVE;
    }

    public boolean isActive() {
        return status == PostAnnotationStatus.ACTIVE;
    }

    public void markDeleted() {
        this.status = PostAnnotationStatus.DELETED;
    }

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
```

Create `src/main/java/blog/domain/PostAnnotationComment.java`:

```java
package blog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static blog.domain.exception.DomainErrorCode.INVALID_INPUT;
import static blog.domain.exception.DomainPreconditions.requireNonBlank;
import static blog.domain.exception.DomainPreconditions.requireNonNull;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "post_annotation_comments")
public class PostAnnotationComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "annotation_id", nullable = false)
    private PostAnnotation annotation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 1000)
    private String content;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public PostAnnotationComment(PostAnnotation annotation, User user, String content) {
        this.annotation = requireNonNull(annotation, INVALID_INPUT, "문장 댓글 정보는 비어있을 수 없습니다.");
        this.user = requireNonNull(user, INVALID_INPUT, "유저 정보는 비어있을 수 없습니다.");
        this.content = requireNonBlank(content, INVALID_INPUT, "댓글 내용은 비어있을 수 없습니다.");
    }

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
```

- [ ] **Step 5: Add repositories**

Create `src/main/java/blog/repository/PostAnnotationRepository.java`:

```java
package blog.repository;

import blog.domain.PostAnnotation;
import blog.domain.PostAnnotationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostAnnotationRepository extends JpaRepository<PostAnnotation, Long> {

    List<PostAnnotation> findByPostIdAndStatusOrderByCreatedAtAsc(Long postId, PostAnnotationStatus status);

    List<PostAnnotation> findByPostIdAndStatus(Long postId, PostAnnotationStatus status);

    Optional<PostAnnotation> findByIdAndPostId(Long id, Long postId);
}
```

Create `src/main/java/blog/repository/PostAnnotationCommentRepository.java`:

```java
package blog.repository;

import blog.domain.PostAnnotationComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostAnnotationCommentRepository extends JpaRepository<PostAnnotationComment, Long> {

    List<PostAnnotationComment> findByAnnotationIdOrderByCreatedAtAsc(Long annotationId);

    Optional<PostAnnotationComment> findByIdAndAnnotationId(Long id, Long annotationId);
}
```

- [ ] **Step 6: Add minimal DTO and service shells to compile the test**

Create `AnnotationRequest` as shown in Task 3 Step 3. Create `PostAnnotationService` with the constructor and method signatures shown in Task 3 Step 4, but only the minimal bodies needed for the Task 2 test.

- [ ] **Step 7: Run test to verify it passes**

Run:

```bash
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'blog.service.PostAnnotationServiceTest'
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/main/resources/schema.sql src/main/java/blog/domain/PostAnnotationStatus.java src/main/java/blog/domain/PostAnnotation.java src/main/java/blog/domain/PostAnnotationComment.java src/main/java/blog/repository/PostAnnotationRepository.java src/main/java/blog/repository/PostAnnotationCommentRepository.java src/main/java/blog/controller/dto/AnnotationRequest.java src/main/java/blog/service/PostAnnotationService.java src/test/java/blog/service/PostAnnotationServiceTest.java
git commit -m "feat: add inline annotation domain"
```

---

## Task 3: Annotation API and Cleanup on Rich Text Save

**Files:**
- Create: `src/main/java/blog/controller/dto/AnnotationRequest.java`
- Create: `src/main/java/blog/controller/dto/AnnotationCommentRequest.java`
- Create: `src/main/java/blog/controller/dto/AnnotationCommentResponse.java`
- Create: `src/main/java/blog/controller/dto/AnnotationResponse.java`
- Modify: `src/main/java/blog/service/PostAnnotationService.java`
- Modify: `src/main/java/blog/service/PostCommandService.java`
- Modify: `src/main/java/blog/controller/PostController.java`
- Test: `src/test/java/blog/service/PostAnnotationServiceTest.java`
- Test: `src/test/java/blog/service/PostCommandServiceTest.java`
- Test: `src/test/java/blog/auth/config/AuthSecurityIntegrationTest.java`

**Interfaces:**
- Produces: `PostAnnotationService.findByPost(Long postId, Long viewerId): List<PostAnnotation>`
- Produces: `PostAnnotationService.findActive(Long postId, Long annotationId): PostAnnotation`
- Produces: `PostAnnotationService.create(Long postId, Long userId, AnnotationRequest request): Long`
- Produces: `PostAnnotationService.addComment(Long postId, Long annotationId, Long userId, AnnotationCommentRequest request): Long`
- Produces: `PostAnnotationService.deleteComment(Long postId, Long annotationId, Long commentId, Long userId): void`
- Produces: `PostAnnotationService.syncDeletedAnnotations(Long postId, Set<Long> remainingIds): void`
- Consumes: `RichTextAnnotationExtractor.extractAnnotationIds(String content)`

- [ ] **Step 1: Add failing cleanup test to PostCommandServiceTest**

Change service fields:

```java
private final RichTextAnnotationExtractor richTextAnnotationExtractor = mock(RichTextAnnotationExtractor.class);
private final PostAnnotationService postAnnotationService = mock(PostAnnotationService.class);
private final PostCommandService postCommandService =
        new PostCommandService(postRepository, postFinder, userService, slugGenerator, richTextAnnotationExtractor, postAnnotationService);
```

Add:

```java
@Test
@DisplayName("Rich Text 글을 수정하면 남아 있는 annotation id 기준으로 삭제된 anchor를 정리한다.")
void syncAnnotationsOnRichTextUpdate() {
    User user = new User("작성자", "author@example.com", null);
    Post post = new Post(
            user,
            "제목",
            "{\"type\":\"doc\",\"content\":[]}",
            null,
            PostStatus.PUBLIC,
            "title",
            null,
            PostContentType.RICH_TEXT
    );
    given(postFinder.find(10L)).willReturn(post);
    String content = "{\"type\":\"doc\",\"content\":[]}";
    given(richTextAnnotationExtractor.extractAnnotationIds(content)).willReturn(java.util.Set.of(1L));
    PostRequest request = new PostRequest("제목", content, null, null, PostContentType.RICH_TEXT, PostCategory.IT, PostStatus.PUBLIC);

    postCommandService.update(10L, user.getId(), request);

    verify(postAnnotationService).syncDeletedAnnotations(10L, java.util.Set.of(1L));
}
```

- [ ] **Step 2: Run cleanup test to verify it fails**

Run:

```bash
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'blog.service.PostCommandServiceTest'
```

Expected: FAIL because `PostCommandService` constructor and cleanup logic do not match.

- [ ] **Step 3: Add DTOs**

Create `src/main/java/blog/controller/dto/AnnotationRequest.java`:

```java
package blog.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AnnotationRequest(
        @NotBlank(message = "선택한 문장을 확인해주세요.")
        @Size(max = 500, message = "선택한 문장은 500자 이하로 입력해주세요.")
        String quotedText,

        @NotBlank(message = "댓글 내용을 입력해주세요.")
        @Size(max = 1000, message = "댓글은 1000자 이하로 입력해주세요.")
        String content
) {
}
```

Create `src/main/java/blog/controller/dto/AnnotationCommentRequest.java`:

```java
package blog.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AnnotationCommentRequest(
        @NotBlank(message = "댓글 내용을 입력해주세요.")
        @Size(max = 1000, message = "댓글은 1000자 이하로 입력해주세요.")
        String content
) {
}
```

Create `src/main/java/blog/controller/dto/AnnotationCommentResponse.java`:

```java
package blog.controller.dto;

import blog.domain.PostAnnotationComment;

import java.time.LocalDateTime;

public record AnnotationCommentResponse(
        Long id,
        Long userId,
        String authorNickname,
        String authorProfileImageUrl,
        String content,
        boolean mine,
        boolean deletable,
        LocalDateTime createdAt
) {

    public static AnnotationCommentResponse from(PostAnnotationComment comment, Long viewerId) {
        boolean mine = viewerId != null && comment.getUser().isWrittenBy(viewerId);
        boolean postAuthor = viewerId != null && comment.getAnnotation().getPost().getUser().isWrittenBy(viewerId);
        return new AnnotationCommentResponse(
                comment.getId(),
                comment.getUser().getId(),
                comment.getUser().getNickname(),
                comment.getUser().getProfileImageUrl(),
                comment.getContent(),
                mine,
                mine || postAuthor,
                comment.getCreatedAt()
        );
    }
}
```

Create `src/main/java/blog/controller/dto/AnnotationResponse.java`:

```java
package blog.controller.dto;

import blog.domain.PostAnnotation;
import blog.domain.PostAnnotationComment;

import java.time.LocalDateTime;
import java.util.List;

public record AnnotationResponse(
        Long id,
        Long authorId,
        String quotedText,
        LocalDateTime createdAt,
        List<AnnotationCommentResponse> comments
) {

    public static AnnotationResponse from(PostAnnotation annotation, List<PostAnnotationComment> comments, Long viewerId) {
        return new AnnotationResponse(
                annotation.getId(),
                annotation.getAuthor().getId(),
                annotation.getQuotedText(),
                annotation.getCreatedAt(),
                comments.stream()
                        .map(comment -> AnnotationCommentResponse.from(comment, viewerId))
                        .toList()
        );
    }
}
```

- [ ] **Step 4: Implement service logic**

Update `src/main/java/blog/service/PostAnnotationService.java`:

```java
package blog.service;

import blog.controller.dto.AnnotationCommentRequest;
import blog.controller.dto.AnnotationRequest;
import blog.domain.*;
import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import blog.repository.PostAnnotationCommentRepository;
import blog.repository.PostAnnotationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostAnnotationService {

    private final PostAnnotationRepository postAnnotationRepository;
    private final PostAnnotationCommentRepository postAnnotationCommentRepository;
    private final PostFinder postFinder;
    private final UserService userService;

    public List<PostAnnotation> findByPost(Long postId, Long viewerId) {
        Post post = postFinder.find(postId);
        if (!post.isViewableBy(viewerId)) {
            throw new BlogException(DomainErrorCode.UNAUTHORIZED_USER, "비공개 게시글 문장 댓글 조회 권한이 없습니다.");
        }
        return postAnnotationRepository.findByPostIdAndStatusOrderByCreatedAtAsc(postId, PostAnnotationStatus.ACTIVE);
    }

    public List<PostAnnotationComment> findComments(Long annotationId) {
        return postAnnotationCommentRepository.findByAnnotationIdOrderByCreatedAtAsc(annotationId);
    }

    @Transactional
    public Long create(Long postId, Long userId, AnnotationRequest request) {
        Post post = postFinder.find(postId);
        User user = userService.getUser(userId);
        ensureRichText(post);
        PostAnnotation annotation = postAnnotationRepository.save(new PostAnnotation(post, user, request.quotedText()));
        postAnnotationCommentRepository.save(new PostAnnotationComment(annotation, user, request.content()));
        return annotation.getId();
    }

    @Transactional
    public Long addComment(Long postId, Long annotationId, Long userId, AnnotationCommentRequest request) {
        PostAnnotation annotation = activeAnnotation(postId, annotationId);
        User user = userService.getUser(userId);
        return postAnnotationCommentRepository.save(new PostAnnotationComment(annotation, user, request.content())).getId();
    }

    @Transactional
    public void deleteComment(Long postId, Long annotationId, Long commentId, Long userId) {
        PostAnnotation annotation = activeAnnotation(postId, annotationId);
        PostAnnotationComment comment = postAnnotationCommentRepository.findByIdAndAnnotationId(commentId, annotationId)
                .orElseThrow(() -> new BlogException(DomainErrorCode.NOT_FOUND, "존재하지 않는 문장 댓글입니다."));
        User requester = userService.getUser(userId);
        boolean author = comment.getUser().isWrittenBy(userId);
        boolean postAuthor = annotation.getPost().getUser().isWrittenBy(requester.getId());
        if (!author && !postAuthor) {
            throw new BlogException(DomainErrorCode.UNAUTHORIZED_USER, "문장 댓글 삭제 권한이 없습니다.");
        }
        postAnnotationCommentRepository.delete(comment);
    }

    @Transactional
    public void syncDeletedAnnotations(Long postId, Set<Long> remainingIds) {
        postAnnotationRepository.findByPostIdAndStatus(postId, PostAnnotationStatus.ACTIVE).stream()
                .filter(annotation -> !remainingIds.contains(annotation.getId()))
                .forEach(PostAnnotation::markDeleted);
    }

    public PostAnnotation findActive(Long postId, Long annotationId) {
        return activeAnnotation(postId, annotationId);
    }

    private PostAnnotation activeAnnotation(Long postId, Long annotationId) {
        PostAnnotation annotation = postAnnotationRepository.findByIdAndPostId(annotationId, postId)
                .orElseThrow(() -> new BlogException(DomainErrorCode.NOT_FOUND, "존재하지 않는 문장 댓글입니다."));
        if (!annotation.isActive()) {
            throw new BlogException(DomainErrorCode.NOT_FOUND, "존재하지 않는 문장 댓글입니다.");
        }
        return annotation;
    }

    private void ensureRichText(Post post) {
        if (post.getContentType() != PostContentType.RICH_TEXT) {
            throw new BlogException(DomainErrorCode.INVALID_INPUT, "Rich Text 글에만 문장 댓글을 남길 수 있습니다.");
        }
    }
}
```

- [ ] **Step 5: Wire cleanup into post updates**

Modify `PostCommandService` constructor fields:

```java
private final RichTextAnnotationExtractor richTextAnnotationExtractor;
private final PostAnnotationService postAnnotationService;
```

In `create`, before constructing `Post`, validate rich text:

```java
if (request.contentTypeOrDefault() == blog.domain.PostContentType.RICH_TEXT) {
    richTextAnnotationExtractor.validate(request.content());
}
```

In `update`, after `post.update(...)`:

```java
if (request.contentTypeOrDefault() == blog.domain.PostContentType.RICH_TEXT) {
    postAnnotationService.syncDeletedAnnotations(
            postId,
            richTextAnnotationExtractor.extractAnnotationIds(request.content())
    );
}
```

- [ ] **Step 6: Add controller endpoints**

Modify `PostController` constructor with `PostAnnotationService`.

Add:

```java
@GetMapping("/{postId}/annotations")
public ResponseEntity<List<AnnotationResponse>> findAnnotations(
        @PathVariable Long postId,
        @AuthenticationPrincipal AuthenticatedUser user
) {
    Long viewerId = userIdOrNull(user);
    List<AnnotationResponse> responses = postAnnotationService.findByPost(postId, viewerId).stream()
            .map(annotation -> AnnotationResponse.from(annotation, postAnnotationService.findComments(annotation.getId()), viewerId))
            .toList();
    return ResponseEntity.ok(responses);
}

@PostMapping("/{postId}/annotations")
public ResponseEntity<AnnotationResponse> createAnnotation(
        @PathVariable Long postId,
        @AuthenticationPrincipal AuthenticatedUser user,
        @Valid @RequestBody AnnotationRequest request
) {
    Long annotationId = postAnnotationService.create(postId, user.userId(), request);
    PostAnnotation annotation = postAnnotationService.findActive(postId, annotationId);
    AnnotationResponse response = AnnotationResponse.from(
            annotation,
            postAnnotationService.findComments(annotation.getId()),
            user.userId()
    );
    return ResponseEntity.created(URI.create("/posts/" + postId + "/annotations/" + annotationId)).body(response);
}

@PostMapping("/{postId}/annotations/{annotationId}/comments")
public ResponseEntity<Void> addAnnotationComment(
        @PathVariable Long postId,
        @PathVariable Long annotationId,
        @AuthenticationPrincipal AuthenticatedUser user,
        @Valid @RequestBody AnnotationCommentRequest request
) {
    Long commentId = postAnnotationService.addComment(postId, annotationId, user.userId(), request);
    return ResponseEntity.created(URI.create("/posts/" + postId + "/annotations/" + annotationId + "/comments/" + commentId)).build();
}

@DeleteMapping("/{postId}/annotations/{annotationId}/comments/{commentId}")
public ResponseEntity<Void> deleteAnnotationComment(
        @PathVariable Long postId,
        @PathVariable Long annotationId,
        @PathVariable Long commentId,
        @AuthenticationPrincipal AuthenticatedUser user
) {
    postAnnotationService.deleteComment(postId, annotationId, commentId, user.userId());
    return ResponseEntity.noContent().build();
}
```

- [ ] **Step 7: Add MockMvc coverage**

Add to `AuthSecurityIntegrationTest`:

```java
@Test
@DisplayName("로그인 사용자는 Rich Text 글에 문장 댓글을 작성할 수 있다.")
void createAnnotationComment() throws Exception {
    User user = userRepository.save(new User("방문자", "visitor3", "visitor3@example.com", null));

    String postLocation = mockMvc.perform(post("/posts")
                    .with(oidcLogin().oidcUser(principal(user.getId(), "visitor3@example.com")))
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {
                              "title": "제목",
                              "content": "{\\"type\\":\\"doc\\",\\"content\\":[]}",
                              "contentType": "RICH_TEXT",
                              "category": "IT",
                              "postStatus": "PUBLIC"
                            }
                            """))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getHeader("Location");

    Long postId = Long.parseLong(postLocation.substring(postLocation.lastIndexOf("/") + 1));

    mockMvc.perform(post("/posts/" + postId + "/annotations")
                    .with(oidcLogin().oidcUser(principal(user.getId(), "visitor3@example.com")))
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {
                              "quotedText": "본문",
                              "content": "여기에 메모"
                            }
                            """))
            .andExpect(status().isCreated());

    mockMvc.perform(get("/posts/" + postId + "/annotations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].quotedText").value("본문"))
            .andExpect(jsonPath("$[0].comments[0].content").value("여기에 메모"));
}
```

- [ ] **Step 8: Run backend tests**

Run:

```bash
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test --tests 'blog.service.PostAnnotationServiceTest' --tests 'blog.service.PostCommandServiceTest' --tests 'blog.auth.config.AuthSecurityIntegrationTest'
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/main/java/blog/controller/PostController.java src/main/java/blog/controller/dto/AnnotationRequest.java src/main/java/blog/controller/dto/AnnotationCommentRequest.java src/main/java/blog/controller/dto/AnnotationCommentResponse.java src/main/java/blog/controller/dto/AnnotationResponse.java src/main/java/blog/service/PostAnnotationService.java src/main/java/blog/service/PostCommandService.java src/test/java/blog/service/PostAnnotationServiceTest.java src/test/java/blog/service/PostCommandServiceTest.java src/test/java/blog/auth/config/AuthSecurityIntegrationTest.java
git commit -m "feat: add inline annotation api"
```

---

## Task 4: Rich Text Renderer and Annotation Helpers

**Files:**
- Create: `src/main/resources/static/js/rich-text.js`
- Create: `src/test/js/rich-text.test.mjs`

**Interfaces:**
- Produces: `renderRichTextDocument(source: string | object): HTMLElement`
- Produces: `extractRichTextPlainText(source: string | object): string`
- Produces: `extractRichTextAnnotationIds(source: string | object): string[]`
- Produces: rendered annotation spans with `class="rich-text-annotation"` and `data-annotation-id`.
- Consumes later: `app.js` detail view and post excerpts.

- [ ] **Step 1: Write failing frontend tests**

Create `src/test/js/rich-text.test.mjs`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import {
    extractRichTextAnnotationIds,
    extractRichTextPlainText,
    renderRichTextDocument
} from "../../main/resources/static/js/rich-text.js";

test("renderRichTextDocument renders annotation marks as clickable spans", () => {
    const rendered = renderRichTextDocument({
        type: "doc",
        content: [{
            type: "paragraph",
            content: [{
                type: "text",
                text: "댓글 문장",
                marks: [{type: "annotation", attrs: {id: "12"}}]
            }]
        }]
    });

    const annotation = rendered.querySelector("[data-annotation-id='12']");
    assert.equal(annotation?.className, "rich-text-annotation");
    assert.equal(annotation?.textContent, "댓글 문장");
});

test("extractRichTextAnnotationIds returns unique annotation ids", () => {
    const ids = extractRichTextAnnotationIds({
        type: "doc",
        content: [{
            type: "paragraph",
            content: [
                {type: "text", text: "A", marks: [{type: "annotation", attrs: {id: "1"}}]},
                {type: "text", text: "B", marks: [{type: "annotation", attrs: {id: "1"}}, {type: "annotation", attrs: {id: "2"}}]}
            ]
        }]
    });

    assert.deepEqual(ids, ["1", "2"]);
});

test("extractRichTextPlainText keeps post excerpts readable", () => {
    assert.equal(extractRichTextPlainText({
        type: "doc",
        content: [
            {type: "heading", attrs: {level: 2}, content: [{type: "text", text: "제목"}]},
            {type: "paragraph", content: [{type: "text", text: "본문"}]}
        ]
    }), "제목 본문");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test src/test/js/rich-text.test.mjs
```

Expected: FAIL because `rich-text.js` does not exist.

- [ ] **Step 3: Implement renderer and helpers**

Create `src/main/resources/static/js/rich-text.js`:

```javascript
const BLOCK_TAGS = {
    paragraph: "p",
    blockquote: "blockquote",
    code_block: "pre"
};

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function parseDocument(source) {
    if (!source) return {type: "doc", content: []};
    if (typeof source === "string") {
        try {
            return JSON.parse(source);
        } catch {
            return {type: "doc", content: []};
        }
    }
    return source;
}

export function extractRichTextAnnotationIds(source) {
    const documentData = parseDocument(source);
    const ids = new Set();
    walk(documentData, node => {
        (node.marks || []).forEach(mark => {
            if (mark.type === "annotation" && mark.attrs?.id !== undefined && mark.attrs.id !== null) {
                ids.add(String(mark.attrs.id));
            }
        });
    });
    return Array.from(ids);
}

export function extractRichTextPlainText(source) {
    const chunks = [];
    walk(parseDocument(source), node => {
        if (node.type === "text" && node.text) {
            chunks.push(node.text);
        }
    });
    return chunks.join(" ").replace(/\s+/g, " ").trim();
}

export function renderRichTextDocument(source) {
    const documentData = parseDocument(source);
    const root = element("div", "markdown-body rich-text-body");
    (documentData.content || []).forEach(child => root.append(renderBlock(child)));
    if (!root.childElementCount) {
        root.append(element("p", "markdown-placeholder", "본문이 비어있어요."));
    }
    return root;
}

function renderBlock(node) {
    if (node.type === "heading") {
        const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
        const heading = element(`h${level}`);
        appendInlineContent(heading, node.content || []);
        return heading;
    }
    if (node.type === "bullet_list" || node.type === "ordered_list") {
        const list = element(node.type === "ordered_list" ? "ol" : "ul");
        (node.content || []).forEach(child => list.append(renderBlock(child)));
        return list;
    }
    if (node.type === "list_item") {
        const item = element("li");
        (node.content || []).forEach(child => item.append(renderBlock(child)));
        return item;
    }
    if (node.type === "code_block") {
        const pre = element("pre");
        const code = element("code", null, textContent(node));
        pre.append(code);
        return pre;
    }
    const tag = BLOCK_TAGS[node.type] || "p";
    const block = element(tag);
    appendInlineContent(block, node.content || []);
    return block;
}

function appendInlineContent(parent, content) {
    content.forEach(child => {
        if (child.type === "text") {
            parent.append(renderText(child));
            return;
        }
        parent.append(renderBlock(child));
    });
}

function renderText(node) {
    let current = document.createTextNode(node.text || "");
    (node.marks || []).forEach(mark => {
        current = wrapMark(current, mark);
    });
    return current;
}

function wrapMark(child, mark) {
    if (mark.type === "annotation") {
        const span = element("span", "rich-text-annotation");
        span.dataset.annotationId = String(mark.attrs?.id || "");
        span.append(child);
        return span;
    }
    if (mark.type === "strong") {
        const strong = element("strong");
        strong.append(child);
        return strong;
    }
    if (mark.type === "em") {
        const em = element("em");
        em.append(child);
        return em;
    }
    if (mark.type === "code") {
        const code = element("code");
        code.append(child);
        return code;
    }
    if (mark.type === "link") {
        const link = element("a");
        link.href = mark.attrs?.href || "#";
        link.append(child);
        return link;
    }
    return child;
}

function textContent(node) {
    const chunks = [];
    walk(node, child => {
        if (child.type === "text" && child.text) chunks.push(child.text);
    });
    return chunks.join("");
}

function walk(node, visit) {
    if (!node || typeof node !== "object") return;
    visit(node);
    (node.content || []).forEach(child => walk(child, visit));
}
```

- [ ] **Step 4: Run frontend rich text tests**

Run:

```bash
node --test src/test/js/rich-text.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Run existing JS tests**

Run:

```bash
node --test src/test/js/markdown.test.mjs src/test/js/markdown-editor.test.mjs src/test/js/canvas-editor.test.mjs src/test/js/rich-text.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/resources/static/js/rich-text.js src/test/js/rich-text.test.mjs
git commit -m "feat: render rich text annotations"
```

---

## Task 5: Detail View Inline Annotation UI

**Files:**
- Modify: `src/main/resources/static/js/api.js`
- Modify: `src/main/resources/static/js/app.js`
- Modify: `src/main/resources/static/css/styles.css`
- Test: `src/test/js/rich-text.test.mjs`

**Interfaces:**
- Consumes: `renderRichTextDocument`, `extractRichTextPlainText`
- Produces API functions:
  - `getAnnotations(postId)`
  - `createAnnotation(postId, annotation)`
  - `addAnnotationComment(postId, annotationId, comment)`
  - `deleteAnnotationComment(postId, annotationId, commentId)`

- [ ] **Step 1: Add API exports**

Modify `src/main/resources/static/js/api.js`:

```javascript
export const getAnnotations = postId => request(`/posts/${postId}/annotations`);
export const createAnnotation = (postId, annotation) => mutation(`/posts/${postId}/annotations`, "POST", annotation);
export const addAnnotationComment = (postId, annotationId, comment) => mutation(`/posts/${postId}/annotations/${annotationId}/comments`, "POST", comment);
export const deleteAnnotationComment = (postId, annotationId, commentId) => mutation(`/posts/${postId}/annotations/${annotationId}/comments/${commentId}`, "DELETE");
```

- [ ] **Step 2: Add Rich Text type imports and excerpt**

Modify `app.js` imports:

```javascript
import {
    extractRichTextPlainText,
    renderRichTextDocument
} from "/js/rich-text.js";
```

Extend `POST_CONTENT_TYPES`:

```javascript
const POST_CONTENT_TYPES = {
    MARKDOWN: "MARKDOWN",
    CANVAS: "CANVAS",
    RICH_TEXT: "RICH_TEXT"
};
```

In `postExcerpt(post)`, before returning `post.content`:

```javascript
if (post.contentType === POST_CONTENT_TYPES.RICH_TEXT) {
    return extractRichTextPlainText(post.content) || "Rich Text로 작성한 글입니다.";
}
```

- [ ] **Step 3: Load annotations in detail view**

Change `renderDetail` Promise:

```javascript
const post = await getPost(id);
const [comments, likedUsers, annotations] = await Promise.all([
    getComments(id),
    getLikedUsers(id),
    post.contentType === POST_CONTENT_TYPES.RICH_TEXT ? getAnnotations(id) : Promise.resolve([])
]);
```

Replace content renderer selection:

```javascript
const isCanvasPost = post.contentType === POST_CONTENT_TYPES.CANVAS;
const isRichTextPost = post.contentType === POST_CONTENT_TYPES.RICH_TEXT;
const renderedContent = isCanvasPost
        ? renderCanvasDocument(post.content)
        : isRichTextPost
                ? renderRichTextDocument(post.content)
                : renderMarkdown(post.content);
```

After appending `renderedContent`, call:

```javascript
if (isRichTextPost) {
    enableAnnotationInteractions(renderedContent, annotations, post.id);
}
```

- [ ] **Step 4: Add minimal detail interactions**

Add in `app.js`:

```javascript
function enableAnnotationInteractions(root, annotations, postId) {
    const byId = new Map(annotations.map(annotation => [String(annotation.id), annotation]));
    root.querySelectorAll("[data-annotation-id]").forEach(node => {
        const annotation = byId.get(node.dataset.annotationId);
        if (!annotation) return;
        node.title = annotation.comments?.[0]?.content || annotation.quotedText;
        node.addEventListener("click", event => {
            event.preventDefault();
            openAnnotationPopover(node, annotation, postId);
        });
    });
}

function openAnnotationPopover(anchor, annotation, postId) {
    document.querySelector(".annotation-popover")?.remove();
    const popover = element("aside", "annotation-popover");
    popover.append(element("strong", null, annotation.quotedText));
    (annotation.comments || []).forEach(comment => {
        const item = element("p", "annotation-comment", comment.content);
        popover.append(item);
    });
    if (state.user) {
        const form = element("form", "annotation-comment-form");
        const input = document.createElement("input");
        input.maxLength = 1000;
        input.placeholder = "답글 입력";
        const submit = button("보내기", "button button-primary", () => {});
        submit.type = "submit";
        form.append(input, submit);
        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (!input.value.trim()) return;
            submit.disabled = true;
            try {
                await addAnnotationComment(postId, annotation.id, {content: input.value.trim()});
                showToast("문장 댓글을 남겼어요.");
                await renderDetail(postId);
            } catch (error) {
                showToast(error.message);
            } finally {
                submit.disabled = false;
            }
        });
        popover.append(form);
    }
    const rect = anchor.getBoundingClientRect();
    popover.style.left = `${Math.min(window.innerWidth - 360, rect.right + 12)}px`;
    popover.style.top = `${window.scrollY + rect.top}px`;
    document.body.append(popover);
}
```

Also add missing imports from `api.js`:

```javascript
addAnnotationComment,
getAnnotations
```

- [ ] **Step 5: Add styles**

Append to `styles.css` near comment styles:

```css
.rich-text-annotation {
    background: color-mix(in srgb, var(--navy-700) 16%, transparent);
    border-bottom: 2px solid var(--navy-700);
    cursor: pointer;
}

.rich-text-annotation:hover,
.rich-text-annotation:focus-visible {
    background: color-mix(in srgb, var(--navy-700) 24%, transparent);
}

.annotation-popover {
    position: absolute;
    z-index: 30;
    width: min(340px, calc(100vw - 32px));
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
}

.annotation-comment {
    margin: 10px 0 0;
    color: var(--text-secondary);
    line-height: 1.55;
}

.annotation-comment-form {
    display: flex;
    gap: 8px;
    margin-top: 14px;
}

.annotation-comment-form input {
    min-width: 0;
    flex: 1;
}
```

- [ ] **Step 6: Run syntax and JS tests**

Run:

```bash
node --check src/main/resources/static/js/app.js
node --check src/main/resources/static/js/api.js
node --test src/test/js/rich-text.test.mjs src/test/js/markdown.test.mjs src/test/js/canvas-editor.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/static/js/api.js src/main/resources/static/js/app.js src/main/resources/static/css/styles.css src/test/js/rich-text.test.mjs
git commit -m "feat: show inline annotation comments"
```

---

## Task 6: ProseMirror Authoring Foundation for Rich Text Posts

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Modify: `.gitignore`
- Create: `src/main/frontend/editor/rich-text-editor.js`
- Create: `src/main/frontend/editor/rich-text-schema.js`
- Create: `src/test/js/rich-text-editor.test.mjs`
- Create bundled output: `src/main/resources/static/js/rich-text-editor.bundle.js`
- Modify: `src/main/resources/static/js/app.js`

**Interfaces:**
- Produces: `createRichTextEditor({mount, initialContent, onChange}): {getContent(): string, destroy(): void}`
- Produces: ProseMirror schema with `annotation` mark.
- Consumes: `posts.content` ProseMirror JSON for `RICH_TEXT` posts.

- [ ] **Step 1: Write failing editor test**

Create `src/test/js/rich-text-editor.test.mjs`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import {createRichTextEditor} from "../../main/frontend/editor/rich-text-editor.js";

test("createRichTextEditor serializes ProseMirror doc JSON", () => {
    const mount = document.createElement("div");
    const editor = createRichTextEditor({
        mount,
        initialContent: "{\"type\":\"doc\",\"content\":[]}",
        onChange: () => {}
    });

    const content = JSON.parse(editor.getContent());
    assert.equal(content.type, "doc");
    editor.destroy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test src/test/js/rich-text-editor.test.mjs
```

Expected: FAIL because editor files and DOM test setup do not exist.

- [ ] **Step 3: Add npm dependencies**

Create `package.json`:

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "build:editor": "esbuild src/main/frontend/editor/rich-text-editor.js --bundle --format=esm --platform=browser --target=es2022 --outfile=src/main/resources/static/js/rich-text-editor.bundle.js",
    "test:js": "node --test src/test/js/*.test.mjs",
    "verify:editor": "npm run build:editor && npm run test:js"
  },
  "dependencies": {
    "prosemirror-commands": "1.7.1",
    "prosemirror-history": "1.5.0",
    "prosemirror-keymap": "1.2.3",
    "prosemirror-model": "1.25.9",
    "prosemirror-schema-basic": "1.2.4",
    "prosemirror-state": "1.4.4",
    "prosemirror-view": "1.42.1"
  },
  "devDependencies": {
    "esbuild": "0.28.1",
    "jsdom": "29.1.1"
  }
}
```

Run:

```bash
npm install
```

Add to `.gitignore`:

```text
node_modules/
```

- [ ] **Step 4: Implement ProseMirror schema**

Create `src/main/frontend/editor/rich-text-schema.js`:

```javascript
import {Schema} from "prosemirror-model";
import {schema as basicSchema} from "prosemirror-schema-basic";

const annotation = {
    attrs: {id: {}},
    inclusive: true,
    parseDOM: [{
        tag: "span[data-annotation-id]",
        getAttrs: dom => ({id: dom.getAttribute("data-annotation-id")})
    }],
    toDOM: mark => ["span", {"data-annotation-id": mark.attrs.id, class: "rich-text-annotation"}, 0]
};

export const richTextSchema = new Schema({
    nodes: basicSchema.spec.nodes,
    marks: basicSchema.spec.marks.addToEnd("annotation", annotation)
});

export function parseRichTextDoc(source) {
    try {
        const json = typeof source === "string" ? JSON.parse(source) : source;
        return richTextSchema.nodeFromJSON(json);
    } catch {
        return richTextSchema.topNodeType.createAndFill();
    }
}
```

- [ ] **Step 5: Implement minimal editor**

Create `src/main/frontend/editor/rich-text-editor.js`:

```javascript
import {baseKeymap} from "prosemirror-commands";
import {history, redo, undo} from "prosemirror-history";
import {keymap} from "prosemirror-keymap";
import {EditorState} from "prosemirror-state";
import {EditorView} from "prosemirror-view";
import {parseRichTextDoc, richTextSchema} from "./rich-text-schema.js";

export function createRichTextEditor({mount, initialContent, onChange = () => {}}) {
    const state = EditorState.create({
        schema: richTextSchema,
        doc: parseRichTextDoc(initialContent),
        plugins: [
            history(),
            keymap({"Mod-z": undo, "Mod-y": redo, "Shift-Mod-z": redo}),
            keymap(baseKeymap)
        ]
    });
    const view = new EditorView(mount, {
        state,
        dispatchTransaction(transaction) {
            const nextState = view.state.apply(transaction);
            view.updateState(nextState);
            onChange(JSON.stringify(nextState.doc.toJSON()));
        }
    });
    return {
        getContent() {
            return JSON.stringify(view.state.doc.toJSON());
        },
        destroy() {
            view.destroy();
        }
    };
}
```

- [ ] **Step 6: Add jsdom setup to test**

At the top of `src/test/js/rich-text-editor.test.mjs`, before importing editor modules dynamically:

```javascript
import {JSDOM} from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.navigator = dom.window.navigator;
```

Then use dynamic import:

```javascript
const {createRichTextEditor} = await import("../../main/frontend/editor/rich-text-editor.js");
```

- [ ] **Step 7: Build bundle and run editor test**

Run:

```bash
npm run build:editor
node --test src/test/js/rich-text-editor.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Integrate Rich Text authoring into app.js**

Import bundle:

```javascript
import {createRichTextEditor} from "/js/rich-text-editor.bundle.js";
```

In `renderEditor`, add a `RICH_TEXT` type option next to Markdown and Canvas. For the initial implementation, default new posts to `RICH_TEXT` only if the user selects a “Rich Text” option. Keep existing Markdown default.

Where Markdown currently uses a `textarea`, create a hidden textarea-like state holder:

```javascript
let richTextEditor = null;
const richTextMount = element("div", "rich-text-editor-mount");
if (selectedContentType === POST_CONTENT_TYPES.RICH_TEXT) {
    richTextEditor = createRichTextEditor({
        mount: richTextMount,
        initialContent: existingPost?.content || "{\"type\":\"doc\",\"content\":[]}",
        onChange: value => {
            contentValue = value;
        }
    });
}
```

When submitting:

```javascript
const content = selectedContentType === POST_CONTENT_TYPES.RICH_TEXT
        ? richTextEditor.getContent()
        : selectedContentType === POST_CONTENT_TYPES.CANVAS
                ? serializeCanvasDocument(canvasEditor)
                : textarea.value;
```

- [ ] **Step 9: Run syntax/build/tests**

Run:

```bash
npm run build:editor
node --check src/main/resources/static/js/app.js
npm run test:js
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json .gitignore src/main/frontend/editor/rich-text-schema.js src/main/frontend/editor/rich-text-editor.js src/main/resources/static/js/rich-text-editor.bundle.js src/main/resources/static/js/app.js src/test/js/rich-text-editor.test.mjs
git commit -m "feat: add rich text authoring editor"
```

---

## Task 7: Selection-to-Annotation Editing Flow

**Files:**
- Modify: `src/main/frontend/editor/rich-text-editor.js`
- Modify: `src/main/frontend/editor/rich-text-schema.js`
- Modify: `src/main/resources/static/js/app.js`
- Modify: `src/main/resources/static/css/styles.css`
- Test: `src/test/js/rich-text-editor.test.mjs`

**Interfaces:**
- Produces: `editor.getSelectedText(): string`
- Produces: `editor.addAnnotationMark(id: string | number): void`
- Consumes: `createAnnotation(postId, {quotedText, content})`

- [ ] **Step 1: Add failing editor command test**

Add to `src/test/js/rich-text-editor.test.mjs`:

```javascript
test("addAnnotationMark stores annotation mark in serialized document", () => {
    const mount = document.createElement("div");
    const editor = createRichTextEditor({
        mount,
        initialContent: JSON.stringify({
            type: "doc",
            content: [{type: "paragraph", content: [{type: "text", text: "댓글 문장"}]}]
        }),
        onChange: () => {}
    });

    editor.selectText(1, 5);
    editor.addAnnotationMark(7);

    const content = JSON.stringify(JSON.parse(editor.getContent()));
    assert.match(content, /"annotation"/);
    assert.match(content, /"7"/);
    editor.destroy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test src/test/js/rich-text-editor.test.mjs
```

Expected: FAIL because `selectText` and `addAnnotationMark` do not exist.

- [ ] **Step 3: Implement editor methods**

Update return object in `rich-text-editor.js`:

```javascript
getSelectedText() {
    const {from, to} = view.state.selection;
    return view.state.doc.textBetween(from, to, " ");
},
selectText(from, to) {
    const selection = TextSelection.create(view.state.doc, from, to);
    view.dispatch(view.state.tr.setSelection(selection));
},
addAnnotationMark(id) {
    const {from, to, empty} = view.state.selection;
    if (empty) return;
    const mark = richTextSchema.marks.annotation.create({id: String(id)});
    view.dispatch(view.state.tr.addMark(from, to, mark));
}
```

Add import:

```javascript
import {EditorState, TextSelection} from "prosemirror-state";
```

- [ ] **Step 4: Add detail/create popover UI**

In `app.js`, for `RICH_TEXT` author-owned edit view, add a “문장 댓글” toolbar button that:

1. Reads `richTextEditor.getSelectedText()`.
2. Opens a small form with `textarea` for the comment.
3. Calls `createAnnotation(post.id, {quotedText, content})`.
4. Reads the returned `AnnotationResponse.id`.
5. Calls `richTextEditor.addAnnotationMark(annotation.id)`.

- [ ] **Step 5: Run editor build and tests**

Run:

```bash
npm run build:editor
node --test src/test/js/rich-text-editor.test.mjs src/test/js/rich-text.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/frontend/editor/rich-text-editor.js src/main/frontend/editor/rich-text-schema.js src/main/resources/static/js/rich-text-editor.bundle.js src/main/resources/static/js/app.js src/main/resources/static/css/styles.css src/test/js/rich-text-editor.test.mjs
git commit -m "feat: anchor comments to rich text selections"
```

---

## Task 8: Full Verification

**Files:**
- Verify all modified files.

**Interfaces:**
- Consumes all previous task outputs.
- Produces final evidence that bottom comments and inline annotation comments coexist.

- [ ] **Step 1: Run backend test suite**

Run:

```bash
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew test
```

Expected: PASS.

- [ ] **Step 2: Run frontend syntax/tests/build**

Run:

```bash
npm run build:editor
npm run test:js
node --check src/main/resources/static/js/app.js
node --check src/main/resources/static/js/api.js
node --check src/main/resources/static/js/rich-text.js
```

Expected: PASS.

- [ ] **Step 3: Manual smoke path**

Start the app:

```bash
JAVA_HOME=/Users/jinriro/Library/Java/JavaVirtualMachines/ms-21.0.10/Contents/Home ./gradlew bootRun
```

Smoke:

1. Create a `RICH_TEXT` post.
2. Select a phrase and add an inline annotation comment.
3. Publish and open detail view.
4. Confirm the highlighted phrase opens the annotation thread.
5. Add a bottom comment and confirm it appears in the existing lower comments section.
6. Edit the post so part of the annotated phrase remains, save, and confirm the annotation remains.
7. Edit the post so the entire annotated phrase is removed, save, and confirm the annotation disappears.

- [ ] **Step 4: Final status**

Report:

```text
Backend: ./gradlew test passed
Frontend: npm run build:editor and npm run test:js passed
Smoke: Rich Text inline annotation comments and bottom comments coexist
Remaining limitation: Markdown and Canvas posts do not support inline annotation comments in this phase
```
