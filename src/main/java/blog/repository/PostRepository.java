package blog.repository;

import blog.domain.Post;
import blog.domain.PostStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {

    List<Post> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Post> findByPostStatusOrderByCreatedAtDesc(PostStatus postStatus);

    boolean existsByUserIdAndSlug(Long userId, String slug);
}
