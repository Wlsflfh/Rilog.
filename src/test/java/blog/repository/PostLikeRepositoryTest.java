package blog.repository;

import blog.domain.Post;
import blog.domain.PostLike;
import blog.domain.PostStatus;
import blog.domain.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(properties = "spring.sql.init.mode=never")
class PostLikeRepositoryTest {

    @Autowired
    private PostLikeRepository postLikeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostRepository postRepository;

    @Test
    @DisplayName("사용자가 좋아요한 게시글 ID를 조회한다.")
    void findLikedPostIds() {
        // given
        User user = userRepository.save(new User("사용자", "user@example.com", null));
        Post post = postRepository.save(new Post(user, "제목", "본문", null, PostStatus.PUBLIC));
        postLikeRepository.saveAndFlush(new PostLike(post, user));

        // when
        Set<Long> likedPostIds =
                postLikeRepository.findLikedPostIds(user.getId(), Set.of(post.getId()));

        // then
        assertThat(likedPostIds).containsExactly(post.getId());
    }

    @Test
    @DisplayName("같은 사용자는 같은 게시글에 좋아요를 두 번 저장할 수 없다.")
    void preventDuplicateLike() {
        // given
        User user = userRepository.save(new User("사용자", "user@example.com", null));
        Post post = postRepository.save(new Post(user, "제목", "본문", null, PostStatus.PUBLIC));
        postLikeRepository.saveAndFlush(new PostLike(post, user));

        // when - then
        assertThatThrownBy(() -> postLikeRepository.saveAndFlush(new PostLike(post, user)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
