package blog.repository;

import blog.domain.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Set;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    long deleteByPostIdAndUserId(Long postId, Long userId);

    List<PostLike> findByPostIdOrderByCreatedAtAsc(Long postId);

    @Query("""
            select pl.post.id
            from PostLike pl
            where pl.user.id = :userId
              and pl.post.id in :postIds
            """)
    Set<Long> findLikedPostIds(
            @Param("userId") Long userId,
            @Param("postIds") Collection<Long> postIds
    );
}
