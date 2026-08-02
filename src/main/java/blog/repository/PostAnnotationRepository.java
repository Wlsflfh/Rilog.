package blog.repository;

import blog.domain.PostAnnotation;
import blog.domain.PostAnnotationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostAnnotationRepository extends JpaRepository<PostAnnotation, Long> {

    List<PostAnnotation> findByPostIdAndStatusOrderByCreatedAtAsc(Long postId, PostAnnotationStatus status);

    List<PostAnnotation> findByPostIdAndStatus(Long postId, PostAnnotationStatus status);

    Optional<PostAnnotation> findByIdAndPostId(Long id, Long postId);
}
