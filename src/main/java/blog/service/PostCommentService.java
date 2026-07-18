package blog.service;

import blog.controller.dto.CommentRequest;
import blog.domain.Post;
import blog.domain.PostComment;
import blog.domain.User;
import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import blog.repository.PostCommentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostCommentService {

    private final PostCommentRepository postCommentRepository;
    private final PostFinder postFinder;
    private final UserService userService;

    public List<PostComment> findByPost(Long postId, Long viewerId) {
        Post post = postFinder.find(postId);
        if (!post.isViewableBy(viewerId)) {
            throw new BlogException(DomainErrorCode.UNAUTHORIZED_USER, "비공개 게시글 댓글 조회 권한이 없습니다.");
        }
        return postCommentRepository.findByPostIdOrderByCreatedAtAsc(postId);
    }

    @Transactional
    public Long create(Long postId, Long userId, CommentRequest request) {
        Post post = postFinder.find(postId);
        User user = userService.getUser(userId);
        PostComment comment = new PostComment(post, user, request.content());
        return postCommentRepository.save(comment).getId();
    }

    @Transactional
    public void delete(Long postId, Long commentId, Long userId) {
        PostComment comment = postCommentRepository.findByIdAndPostId(commentId, postId)
                .orElseThrow(() -> {
                    log.info("댓글 삭제 실패: postId={}, commentId={}, reason=not_found", postId, commentId);
                    return new BlogException(DomainErrorCode.NOT_FOUND, "존재하지 않는 댓글입니다.");
        });
        User requester = userService.getUser(userId);
        boolean author = comment.getUser().isWrittenBy(userId);
        if (author) {
            postCommentRepository.delete(comment);
            return;
        }

        boolean postAuthor = comment.getPost().getUser().isWrittenBy(requester.getId());
        if (!postAuthor) {
            throw new BlogException(DomainErrorCode.UNAUTHORIZED_USER, "댓글 삭제 권한이 없습니다.");
        }
        postCommentRepository.delete(comment);
    }
}
