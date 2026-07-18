package blog.service;

import blog.domain.Post;
import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import blog.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PostFinder {

    private final PostRepository postRepository;

    public Post find(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> {
                    log.info("게시글 조회 실패: postId={}, reason=not_found", postId);
                    return new BlogException(DomainErrorCode.NOT_FOUND, "게시글이 존재하지 않습니다.");
                });
    }
}
