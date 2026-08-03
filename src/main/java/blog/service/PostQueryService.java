package blog.service;

import blog.domain.Post;
import blog.domain.PostCategory;
import blog.domain.PostViewEvent;
import blog.domain.PostStatus;
import blog.domain.exception.BlogException;
import blog.domain.exception.DomainErrorCode;
import blog.repository.PostLikeRepository;
import blog.repository.PostRepository;
import blog.repository.PostViewEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostQueryService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostViewEventRepository postViewEventRepository;
    private final PostFinder postFinder;

    public List<PostQueryResult> findAll(Long userId) {
        return findAll(userId, null);
    }

    public List<PostQueryResult> findAll(Long userId, PostCategory category) {
        List<Post> posts = category == null
                ? postRepository.findByPostStatusOrderByCreatedAtDesc(PostStatus.PUBLIC)
                : postRepository.findByPostStatusAndCategoryOrderByCreatedAtDesc(PostStatus.PUBLIC, category);
        return toResults(
                posts,
                userId
        );
    }

    @Transactional
    public PostQueryResult findById(Long postId, Long userId) {
        Post post = postFinder.find(postId);
        if (!post.isViewableBy(userId)) {
            throw new BlogException(DomainErrorCode.UNAUTHORIZED_USER, "비공개 게시글 조회 권한이 없습니다.");
        }
        post.increaseViewCount();
        postViewEventRepository.save(new PostViewEvent(post, userId));
        boolean liked = userId != null
                && postLikeRepository.existsByPostIdAndUserId(postId, userId);
        return new PostQueryResult(post, liked);
    }

    public PostQueryResult findByIdWithoutIncreasingView(Long postId, Long userId) {
        Post post = postFinder.find(postId);
        if (!post.isViewableBy(userId)) {
            throw new BlogException(DomainErrorCode.UNAUTHORIZED_USER, "비공개 게시글 조회 권한이 없습니다.");
        }
        boolean liked = userId != null
                && postLikeRepository.existsByPostIdAndUserId(postId, userId);
        return new PostQueryResult(post, liked);
    }

    public List<PostQueryResult> findByUser(Long ownerId, Long viewerId) {
        List<Post> viewablePosts = postRepository.findByUserIdOrderByCreatedAtDesc(ownerId).stream()
                .filter(post -> post.isViewableBy(viewerId))
                .toList();
        return toResults(viewablePosts, viewerId);
    }

    private List<PostQueryResult> toResults(List<Post> posts, Long userId) {
        List<Long> postIds = posts.stream()
                .map(Post::getId)
                .toList();
        Set<Long> likedPostIds = findLikedPostIds(postIds, userId);

        return posts.stream()
                .map(post -> new PostQueryResult(post, likedPostIds.contains(post.getId())))
                .toList();
    }

    private Set<Long> findLikedPostIds(List<Long> postIds, Long userId) {
        if (userId == null || postIds.isEmpty()) {
            return Set.of();
        }
        return postLikeRepository.findLikedPostIds(userId, postIds);
    }
}
