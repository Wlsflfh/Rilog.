package blog.service;

import blog.controller.dto.PostRequest;
import blog.domain.Post;
import blog.domain.User;
import blog.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostCommandService {

    private final PostRepository postRepository;
    private final PostFinder postFinder;
    private final UserService userService;
    private final SlugGenerator slugGenerator;

    @Transactional
    public Long create(Long userId, PostRequest request) {
        User user = userService.getUser(userId);
        String slug = slugGenerator.generate(userId, request.title());
        Post post = new Post(
                user,
                request.title(),
                request.content(),
                request.thumbnailUrl(),
                request.postStatus(),
                slug,
                request.summary(),
                request.contentTypeOrDefault()
        );
        return postRepository.save(post).getId();
    }

    @Transactional
    public void update(Long postId, Long userId, PostRequest request) {
        Post post = postFinder.find(postId);
        post.ensureOwnedBy(userId);
        post.update(
                request.title(),
                request.content(),
                request.thumbnailUrl(),
                request.postStatus(),
                post.getSlug(),
                request.summary(),
                post.getContentType()
        );
    }

    @Transactional
    public void delete(Long postId, Long userId) {
        Post post = postFinder.find(postId);
        post.ensureOwnedBy(userId);
        postRepository.delete(post);
    }
}
