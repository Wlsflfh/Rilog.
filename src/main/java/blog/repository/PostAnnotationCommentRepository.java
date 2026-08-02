package blog.repository;

import blog.domain.PostAnnotationComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PostAnnotationCommentRepository extends JpaRepository<PostAnnotationComment, Long> {

    List<PostAnnotationComment> findByAnnotationIdOrderByCreatedAtAsc(Long annotationId);

    List<PostAnnotationComment> findByAnnotationIdInOrderByCreatedAtAsc(List<Long> annotationIds);

    Optional<PostAnnotationComment> findByIdAndAnnotationId(Long id, Long annotationId);
}
