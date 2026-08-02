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
