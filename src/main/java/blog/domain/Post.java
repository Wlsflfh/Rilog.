package blog.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static blog.domain.exception.DomainErrorCode.INVALID_INPUT;
import static blog.domain.exception.DomainErrorCode.UNAUTHORIZED_USER;
import static blog.domain.exception.DomainPreconditions.requireNonNull;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "posts")
public class Post {

    private static final int INIT_COUNT = 0;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String slug;

    @Column(length = 500)
    private String summary;

    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostContentType contentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostCategory category;

    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostStatus postStatus;

    private long viewCount;
    private long likeCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Post(User user, String title, String content, String thumbnailUrl, PostStatus postStatus) {
        this(user, title, content, thumbnailUrl, postStatus, defaultSlug(title), defaultSummary(content), PostContentType.MARKDOWN, PostCategory.IT);
    }

    public Post(
            User user,
            String title,
            String content,
            String thumbnailUrl,
            PostStatus postStatus,
            String slug,
            String summary
    ) {
        this(user, title, content, thumbnailUrl, postStatus, slug, summary, PostContentType.MARKDOWN, PostCategory.IT);
    }

    public Post(
            User user,
            String title,
            String content,
            String thumbnailUrl,
            PostStatus postStatus,
            String slug,
            String summary,
            PostContentType contentType
    ) {
        this(user, title, content, thumbnailUrl, postStatus, slug, summary, contentType, PostCategory.IT);
    }

    public Post(
            User user,
            String title,
            String content,
            String thumbnailUrl,
            PostStatus postStatus,
            String slug,
            String summary,
            PostContentType contentType,
            PostCategory category
    ) {
        this.user = requireNonNull(user, INVALID_INPUT, "유저 정보는 비어있을 수 없습니다.");
        this.title = requireNonNull(title, INVALID_INPUT, "제목은 비어있을 수 없습니다.");
        this.content = requireNonNull(content, INVALID_INPUT, "본문은 비어있을 수 없습니다.");
        this.contentType = defaultContentType(contentType);
        this.category = requireNonNull(category, INVALID_INPUT, "카테고리는 비어있을 수 없습니다.");
        this.thumbnailUrl = thumbnailUrl;
        this.postStatus = requireNonNull(postStatus, INVALID_INPUT, "게시 상태는 비어있을 수 없습니다.");
        this.slug = requireNonNull(slug, INVALID_INPUT, "게시글 주소는 비어있을 수 없습니다.");
        this.summary = summary;
        this.viewCount = INIT_COUNT;
        this.likeCount = INIT_COUNT;
    }

    public void update(String title, String content, String thumbnailUrl, PostStatus postStatus) {
        this.title = title;
        this.content = content;
        this.thumbnailUrl = thumbnailUrl;
        this.postStatus = postStatus;
        this.summary = defaultSummary(content);
    }

    public void update(String title, String content, String thumbnailUrl, PostStatus postStatus, String slug, String summary) {
        this.title = title;
        this.content = content;
        this.thumbnailUrl = thumbnailUrl;
        this.postStatus = postStatus;
        this.slug = requireNonNull(slug, INVALID_INPUT, "게시글 주소는 비어있을 수 없습니다.");
        this.summary = summary;
    }

    public void update(
            String title,
            String content,
            String thumbnailUrl,
            PostStatus postStatus,
            String slug,
            String summary,
            PostContentType contentType,
            PostCategory category
    ) {
        this.title = title;
        this.content = content;
        this.thumbnailUrl = thumbnailUrl;
        this.postStatus = postStatus;
        this.slug = requireNonNull(slug, INVALID_INPUT, "게시글 주소는 비어있을 수 없습니다.");
        this.summary = summary;
        this.contentType = defaultContentType(contentType);
        this.category = requireNonNull(category, INVALID_INPUT, "카테고리는 비어있을 수 없습니다.");
    }

    public void ensureOwnedBy(Long userId) {
        if (!user.isWrittenBy(userId)) {
            throw new blog.domain.exception.BlogException(UNAUTHORIZED_USER, "게시글 수정 권한이 없습니다.");
        }
    }

    public boolean isViewableBy(Long userId) {
        return postStatus == PostStatus.PUBLIC
                || (userId != null && user.isWrittenBy(userId));
    }

    public void increaseViewCount() {
        this.viewCount++;
    }

    public void increaseLikeCount() {
        this.likeCount++;
    }

    public void decreaseLikeCount() {
        if (this.likeCount > 0) {
            this.likeCount--;
        }
    }

    private static String defaultSlug(String title) {
        if (title == null || title.isBlank()) {
            return "post";
        }
        return title.trim()
                .toLowerCase()
                .replaceAll("[^a-z0-9가-힣]+", "-")
                .replaceAll("^-|-$", "");
    }

    private static String defaultSummary(String content) {
        if (content == null) {
            return null;
        }
        String normalized = content.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= 160) {
            return normalized;
        }
        return normalized.substring(0, 160);
    }

    private static PostContentType defaultContentType(PostContentType contentType) {
        return contentType == null ? PostContentType.MARKDOWN : contentType;
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
