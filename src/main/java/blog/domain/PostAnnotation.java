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
