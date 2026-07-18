package blog.service;

import blog.domain.Post;
import blog.domain.PostStatus;
import blog.domain.exception.BlogException;
import blog.repository.PostLikeRepository;
import blog.repository.PostRepository;
import blog.repository.PostViewEventRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class PostQueryServiceTest {

    private final PostRepository postRepository = mock(PostRepository.class);
    private final PostLikeRepository postLikeRepository = mock(PostLikeRepository.class);
    private final PostViewEventRepository postViewEventRepository = mock(PostViewEventRepository.class);
    private final PostFinder postFinder = mock(PostFinder.class);
    private final PostQueryService postQueryService =
            new PostQueryService(postRepository, postLikeRepository, postViewEventRepository, postFinder);

    @Test
    @DisplayName("게시글 목록에 현재 사용자의 좋아요 여부를 조합한다.")
    void findAll() {
        // given
        Post likedPost = mock(Post.class);
        Post unlikedPost = mock(Post.class);
        given(likedPost.getId()).willReturn(1L);
        given(unlikedPost.getId()).willReturn(2L);
        given(postRepository.findByPostStatusOrderByCreatedAtDesc(PostStatus.PUBLIC))
                .willReturn(List.of(likedPost, unlikedPost));
        given(postLikeRepository.findLikedPostIds(3L, List.of(1L, 2L)))
                .willReturn(Set.of(1L));

        // when
        List<PostQueryResult> results = postQueryService.findAll(3L);

        // then
        assertThat(results)
                .extracting(PostQueryResult::liked)
                .containsExactly(true, false);
    }

    @Test
    @DisplayName("비공개 게시글은 작성자만 상세 조회할 수 있다.")
    void rejectPrivatePost() {
        // given
        Post post = mock(Post.class);
        given(postFinder.find(1L)).willReturn(post);
        given(post.isViewableBy(2L)).willReturn(false);

        // when - then
        assertThatThrownBy(() -> postQueryService.findById(1L, 2L))
                .isInstanceOf(BlogException.class);
    }
}
