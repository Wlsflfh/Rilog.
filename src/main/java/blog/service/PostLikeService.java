package blog.service;

import blog.domain.Post;
import blog.domain.PostLike;
import blog.domain.User;
import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import blog.repository.PostLikeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostLikeService {

    private final PostLikeRepository postLikeRepository;
    private final PostFinder postFinder;
    private final UserService userService;

    @Transactional
    public void like(Long postId, Long userId) {
        if (postLikeRepository.existsByPostIdAndUserId(postId, userId)) {
            return;
        }

        Post post = postFinder.find(postId);
        User user = userService.getUser(userId);
        postLikeRepository.save(new PostLike(post, user));
        post.increaseLikeCount();
    }

    @Transactional
    public void unlike(Long postId, Long userId) {
        Post post = postFinder.find(postId);
        long deletedCount = postLikeRepository.deleteByPostIdAndUserId(postId, userId);
        if (deletedCount > 0) {
            post.decreaseLikeCount();
        }
    }

    public List<User> findLikedUsers(Long postId, Long viewerId) {
        Post post = postFinder.find(postId);
        if (!post.isViewableBy(viewerId)) {
            throw new BlogException(DomainErrorCode.UNAUTHORIZED_USER, "비공개 게시글 좋아요 조회 권한이 없습니다.");
        }
        return postLikeRepository.findByPostIdOrderByCreatedAtAsc(postId).stream()
                .map(PostLike::getUser)
                .toList();
    }

}
