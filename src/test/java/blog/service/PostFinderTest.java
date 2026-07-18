package blog.service;

import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import blog.repository.PostRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class PostFinderTest {

    private final PostRepository postRepository = mock(PostRepository.class);
    private final PostFinder postFinder = new PostFinder(postRepository);

    @Test
    @DisplayName("존재하지 않는 게시글을 조회하면 예외를 던진다.")
    void findById() {
        // given
        given(postRepository.findById(1L)).willReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> postFinder.find(1L))
                .isInstanceOf(BlogException.class)
                .extracting("code")
                .isEqualTo(DomainErrorCode.NOT_FOUND);
    }
}
