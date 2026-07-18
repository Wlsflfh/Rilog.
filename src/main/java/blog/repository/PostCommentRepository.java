package blog.repository;

import blog.domain.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    List<PostComment> findByPostIdOrderByCreatedAtAsc(Long postId);

    Optional<PostComment> findByIdAndPostId(Long id, Long postId);

    long countByPostUserId(Long userId);

    @Query("""
            select pc.post.id, count(pc.id)
            from PostComment pc
            where pc.post.user.id = :userId
            group by pc.post.id
            order by count(pc.id) desc, pc.post.id asc
            """)
    List<Object[]> findTopCommentedPostsByUserId(Long userId);
}
