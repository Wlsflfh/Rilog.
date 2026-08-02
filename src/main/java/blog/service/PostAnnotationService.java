package blog.service;

import blog.controller.dto.AnnotationRequest;
import blog.controller.dto.AnnotationCommentRequest;
import blog.domain.Post;
import blog.domain.PostAnnotation;
import blog.domain.PostAnnotationComment;
import blog.domain.PostAnnotationStatus;
import blog.domain.PostContentType;
import blog.domain.User;
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

    public PostAnnotation findActive(Long postId, Long annotationId) {
        return activeAnnotation(postId, annotationId);
    }

    public List<PostAnnotationComment> findComments(Long annotationId) {
        return postAnnotationCommentRepository.findByAnnotationIdOrderByCreatedAtAsc(annotationId);
    }

    @Transactional
    public Long create(Long postId, Long userId, AnnotationRequest request) {
        Post post = postFinder.find(postId);
        User user = userService.getUser(userId);
        ensureRichText(post);
        ensureViewable(post, userId);

        PostAnnotation annotation = postAnnotationRepository.save(new PostAnnotation(post, user, request.quotedText()));
        postAnnotationCommentRepository.save(new PostAnnotationComment(annotation, user, request.content()));
        return annotation.getId();
    }

    @Transactional
    public Long addComment(Long postId, Long annotationId, Long userId, AnnotationCommentRequest request) {
        PostAnnotation annotation = activeAnnotation(postId, annotationId);
        User user = userService.getUser(userId);
        ensureViewable(annotation.getPost(), userId);
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

    private void ensureViewable(Post post, Long userId) {
        if (!post.isViewableBy(userId)) {
            throw new BlogException(DomainErrorCode.UNAUTHORIZED_USER, "비공개 게시글 문장 댓글 권한이 없습니다.");
        }
    }
}
