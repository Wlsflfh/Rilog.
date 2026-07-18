package blog.service;

import blog.controller.dto.DashboardStatsResponse;
import blog.domain.Post;
import blog.domain.PostViewEvent;
import blog.repository.PostCommentRepository;
import blog.repository.PostRepository;
import blog.repository.PostViewEventRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class DashboardStatsServiceTest {

    private final PostRepository postRepository = mock(PostRepository.class);
    private final PostCommentRepository postCommentRepository = mock(PostCommentRepository.class);
    private final PostViewEventRepository postViewEventRepository = mock(PostViewEventRepository.class);
    private final Clock clock = Clock.fixed(
            Instant.parse("2026-07-15T12:00:00Z"),
            ZoneId.of("Asia/Seoul")
    );
    private final DashboardStatsService dashboardStatsService = new DashboardStatsService(
            postRepository,
            postCommentRepository,
            postViewEventRepository,
            clock
    );

    @Test
    @DisplayName("내 블로그 통계 요약과 최근 7일 조회수를 만든다.")
    void getStats() {
        // given
        Post viewedPost = post(1L, "JPA 연관관계", 30, 4);
        Post likedPost = post(2L, "Spring Security", 12, 9);
        given(postRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .willReturn(List.of(viewedPost, likedPost));
        given(postCommentRepository.countByPostUserId(1L)).willReturn(5L);
        given(postCommentRepository.findTopCommentedPostsByUserId(1L))
                .willReturn(List.<Object[]>of(new Object[]{1L, 3L}));
        given(postViewEventRepository.findByPostUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                1L,
                LocalDate.of(2026, 7, 9).atStartOfDay(),
                LocalDate.of(2026, 7, 16).atStartOfDay()
        )).willReturn(List.of(
                viewEvent(LocalDate.of(2026, 7, 14).atTime(10, 0)),
                viewEvent(LocalDate.of(2026, 7, 14).atTime(11, 0)),
                viewEvent(LocalDate.of(2026, 7, 15).atTime(9, 0)),
                viewEvent(LocalDate.of(2026, 7, 15).atTime(10, 0)),
                viewEvent(LocalDate.of(2026, 7, 15).atTime(11, 0)),
                viewEvent(LocalDate.of(2026, 7, 15).atTime(12, 0))
        ));

        // when
        DashboardStatsResponse response = dashboardStatsService.getStats(1L);

        // then
        assertThat(response.summary().postCount()).isEqualTo(2);
        assertThat(response.summary().totalViews()).isEqualTo(42);
        assertThat(response.summary().totalLikes()).isEqualTo(13);
        assertThat(response.summary().totalComments()).isEqualTo(5);
        assertThat(response.dailyViews())
                .extracting(DashboardStatsResponse.DailyView::date)
                .containsExactly(
                        LocalDate.of(2026, 7, 9),
                        LocalDate.of(2026, 7, 10),
                        LocalDate.of(2026, 7, 11),
                        LocalDate.of(2026, 7, 12),
                        LocalDate.of(2026, 7, 13),
                        LocalDate.of(2026, 7, 14),
                        LocalDate.of(2026, 7, 15)
                );
        assertThat(response.dailyViews())
                .extracting(DashboardStatsResponse.DailyView::viewCount)
                .containsExactly(0L, 0L, 0L, 0L, 0L, 2L, 4L);
        assertThat(response.topViewedPosts())
                .extracting(DashboardStatsResponse.TopPost::title)
                .containsExactly("JPA 연관관계", "Spring Security");
        assertThat(response.topLikedPosts())
                .extracting(DashboardStatsResponse.TopPost::title)
                .containsExactly("Spring Security", "JPA 연관관계");
        assertThat(response.topCommentedPosts())
                .extracting(DashboardStatsResponse.TopPost::commentCount)
                .containsExactly(3L);
        assertThat(response.insightMessage()).isEqualTo("이번 주에 6명이 당신의 글을 읽었어요.");
    }

    private Post post(Long id, String title, long viewCount, long likeCount) {
        Post post = mock(Post.class);
        given(post.getId()).willReturn(id);
        given(post.getTitle()).willReturn(title);
        given(post.getSlug()).willReturn(title.toLowerCase().replace(" ", "-"));
        given(post.getViewCount()).willReturn(viewCount);
        given(post.getLikeCount()).willReturn(likeCount);
        return post;
    }

    private PostViewEvent viewEvent(java.time.LocalDateTime createdAt) {
        PostViewEvent event = new PostViewEvent(mock(Post.class), null);
        ReflectionTestUtils.setField(event, "createdAt", createdAt);
        return event;
    }
}
