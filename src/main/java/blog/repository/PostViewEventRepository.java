package blog.repository;

import blog.domain.PostViewEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PostViewEventRepository extends JpaRepository<PostViewEvent, Long> {

    List<PostViewEvent> findByPostUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            Long userId,
            LocalDateTime start,
            LocalDateTime end
    );
}
