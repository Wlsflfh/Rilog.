package blog.service;

import blog.controller.dto.CommentRequest;
import blog.domain.Post;
import blog.domain.PostComment;
import blog.domain.PostStatus;
import blog.domain.User;
import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import blog.repository.PostCommentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

class PostCommentServiceTest {

    private final PostCommentRepository postCommentRepository = mock(PostCommentRepository.class);
    private final PostFinder postFinder = mock(PostFinder.class);
    private final UserService userService = mock(UserService.class);
    private final PostCommentService postCommentService =
            new PostCommentService(postCommentRepository, postFinder, userService);

    @Test
    @DisplayName("로그인한 사용자는 게시글에 댓글을 작성할 수 있다.")
    void create() {
        // given
        Post post = post();
        User user = new User("방문자", "visitor@example.com", null);
        PostComment saved = mock(PostComment.class);
        given(postFinder.find(1L)).willReturn(post);
        given(userService.getUser(2L)).willReturn(user);
        given(postCommentRepository.save(any(PostComment.class))).willReturn(saved);

        // when
        postCommentService.create(1L, 2L, new CommentRequest("좋은 글이에요."));

        // then
        verify(postCommentRepository).save(any(PostComment.class));
    }

    @Test
    @DisplayName("댓글 작성자는 자신의 댓글을 삭제할 수 있다.")
    void deleteByAuthor() {
        // given
        Post post = mock(Post.class);
        User author = mock(User.class);
        PostComment comment = mock(PostComment.class);
        given(author.isWrittenBy(2L)).willReturn(true);
        given(comment.getUser()).willReturn(author);
        given(comment.getPost()).willReturn(post);
        given(postCommentRepository.findByIdAndPostId(3L, 1L)).willReturn(Optional.of(comment));
        given(userService.getUser(2L)).willReturn(new User("방문자", "visitor@example.com", null));

        // when
        postCommentService.delete(1L, 3L, 2L);

        // then
        verify(postCommentRepository).delete(comment);
    }

    @Test
    @DisplayName("댓글 작성자도 글 작성자도 아니면 댓글을 삭제할 수 없다.")
    void rejectDeleteByOtherUser() {
        // given
        Post post = mock(Post.class);
        User author = mock(User.class);
        PostComment comment = mock(PostComment.class);
        given(author.isWrittenBy(2L)).willReturn(false);
        given(post.isViewableBy(2L)).willReturn(true);
        given(post.getUser()).willReturn(author);
        given(comment.getUser()).willReturn(author);
        given(comment.getPost()).willReturn(post);
        given(postCommentRepository.findByIdAndPostId(3L, 1L)).willReturn(Optional.of(comment));
        given(userService.getUser(2L)).willReturn(new User("방문자", "visitor@example.com", null));

        // when - then
        assertThatThrownBy(() -> postCommentService.delete(1L, 3L, 2L))
                .isInstanceOf(BlogException.class)
                .extracting("code")
                .isEqualTo(DomainErrorCode.UNAUTHORIZED_USER);
        verify(postCommentRepository, never()).delete(any());
    }

    private Post post() {
        return new Post(new User("진리로", "wlsflfh@gmail.com", null), "제목", "본문", null, PostStatus.PUBLIC);
    }
}
