package blog.service;

import blog.domain.Post;
import blog.domain.PostLike;
import blog.domain.PostStatus;
import blog.domain.User;
import blog.repository.PostLikeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

class PostLikeServiceTest {

    private final PostLikeRepository postLikeRepository = mock(PostLikeRepository.class);
    private final PostFinder postFinder = mock(PostFinder.class);
    private final UserService userService = mock(UserService.class);
    private final PostLikeService postLikeService =
            new PostLikeService(postLikeRepository, postFinder, userService);

    @Test
    @DisplayName("처음 좋아요를 누르면 관계를 저장하고 개수를 증가시킨다.")
    void like() {
        // given
        Post post = post();
        User user = user();
        given(postLikeRepository.existsByPostIdAndUserId(1L, 2L)).willReturn(false);
        given(postFinder.find(1L)).willReturn(post);
        given(userService.getUser(2L)).willReturn(user);

        // when
        postLikeService.like(1L, 2L);

        // then
        verify(postLikeRepository).save(any(PostLike.class));
        assertThat(post.getLikeCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("이미 좋아요한 게시글에 다시 요청하면 아무것도 변경하지 않는다.")
    void likeAgain() {
        // given
        given(postLikeRepository.existsByPostIdAndUserId(1L, 2L)).willReturn(true);

        // when
        postLikeService.like(1L, 2L);

        // then
        verify(postLikeRepository, never()).save(any());
        verifyNoInteractions(postFinder, userService);
    }

    @Test
    @DisplayName("좋아요를 취소하면 관계를 삭제하고 개수를 감소시킨다.")
    void unlike() {
        // given
        Post post = post();
        post.increaseLikeCount();
        given(postFinder.find(1L)).willReturn(post);
        given(postLikeRepository.deleteByPostIdAndUserId(1L, 2L)).willReturn(1L);

        // when
        postLikeService.unlike(1L, 2L);

        // then
        assertThat(post.getLikeCount()).isZero();
    }

    @Test
    @DisplayName("좋아요하지 않은 게시글을 취소하면 개수를 변경하지 않는다.")
    void unlikeAgain() {
        // given
        Post post = post();
        given(postFinder.find(1L)).willReturn(post);
        given(postLikeRepository.deleteByPostIdAndUserId(1L, 2L)).willReturn(0L);

        // when
        postLikeService.unlike(1L, 2L);

        // then
        assertThat(post.getLikeCount()).isZero();
    }

    @Test
    @DisplayName("게시글에 좋아요를 누른 사용자를 조회한다.")
    void findLikedUsers() {
        // given
        Post post = post();
        User user = user();
        PostLike postLike = mock(PostLike.class);
        given(postFinder.find(1L)).willReturn(post);
        given(postLike.getUser()).willReturn(user);
        given(postLikeRepository.findByPostIdOrderByCreatedAtAsc(1L)).willReturn(List.of(postLike));

        // when
        List<User> likedUsers = postLikeService.findLikedUsers(1L, null);

        // then
        assertThat(likedUsers).containsExactly(user);
    }

    private Post post() {
        return new Post(user(), "제목", "본문", null, PostStatus.PUBLIC);
    }

    private User user() {
        return new User("사용자", "user@example.com", null);
    }
}
