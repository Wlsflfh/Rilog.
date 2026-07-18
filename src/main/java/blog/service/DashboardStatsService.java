package blog.service;

import blog.controller.dto.DashboardStatsResponse;
import blog.domain.Post;
import blog.domain.PostViewEvent;
import blog.repository.PostCommentRepository;
import blog.repository.PostRepository;
import blog.repository.PostViewEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.LongStream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardStatsService {

    private static final int RECENT_DAYS = 7;
    private static final int TOP_LIMIT = 5;

    private final PostRepository postRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostViewEventRepository postViewEventRepository;
    private final Clock clock;

    public DashboardStatsResponse getStats(Long userId) {
        List<Post> posts = postRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Map<Long, Post> postsById = posts.stream()
                .collect(Collectors.toMap(Post::getId, Function.identity()));
        Map<Long, Long> commentCounts = postCommentRepository.findTopCommentedPostsByUserId(userId).stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> (Long) row[1]
                ));

        long totalViews = posts.stream().mapToLong(Post::getViewCount).sum();
        long totalLikes = posts.stream().mapToLong(Post::getLikeCount).sum();
        long totalComments = postCommentRepository.countByPostUserId(userId);
        List<DashboardStatsResponse.DailyView> dailyViews = dailyViews(userId);

        return new DashboardStatsResponse(
                new DashboardStatsResponse.Summary(posts.size(), totalViews, totalLikes, totalComments),
                dailyViews,
                topPosts(posts, post -> post.getViewCount() > 0, Comparator.comparingLong(Post::getViewCount).reversed(), commentCounts),
                topPosts(posts, post -> post.getLikeCount() > 0, Comparator.comparingLong(Post::getLikeCount).reversed(), commentCounts),
                topCommentedPosts(commentCounts, postsById),
                insightMessage(dailyViews, totalViews)
        );
    }

    private List<DashboardStatsResponse.DailyView> dailyViews(Long userId) {
        LocalDate today = LocalDate.now(clock);
        LocalDate startDate = today.minusDays(RECENT_DAYS - 1L);
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();
        Map<LocalDate, Long> countsByDate = postViewEventRepository
                .findByPostUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(userId, start, end)
                .stream()
                .collect(Collectors.groupingBy(
                        event -> event.getCreatedAt().toLocalDate(),
                        Collectors.counting()
                ));

        return LongStream.range(0, RECENT_DAYS)
                .mapToObj(startDate::plusDays)
                .map(date -> new DashboardStatsResponse.DailyView(date, countsByDate.getOrDefault(date, 0L)))
                .toList();
    }

    private List<DashboardStatsResponse.TopPost> topPosts(
            List<Post> posts,
            Predicate<Post> predicate,
            Comparator<Post> comparator,
            Map<Long, Long> commentCounts
    ) {
        return posts.stream()
                .filter(predicate)
                .sorted(comparator.thenComparing(Post::getId))
                .limit(TOP_LIMIT)
                .map(post -> toTopPost(post, commentCounts.getOrDefault(post.getId(), 0L)))
                .toList();
    }

    private List<DashboardStatsResponse.TopPost> topCommentedPosts(Map<Long, Long> commentCounts, Map<Long, Post> postsById) {
        return commentCounts.entrySet().stream()
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed().thenComparing(Map.Entry::getKey))
                .limit(TOP_LIMIT)
                .map(entry -> {
                    Post post = postsById.get(entry.getKey());
                    return post == null ? null : toTopPost(post, entry.getValue());
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private DashboardStatsResponse.TopPost toTopPost(Post post, long commentCount) {
        return new DashboardStatsResponse.TopPost(
                post.getId(),
                post.getTitle(),
                post.getSlug(),
                post.getViewCount(),
                post.getLikeCount(),
                commentCount
        );
    }

    private String insightMessage(List<DashboardStatsResponse.DailyView> dailyViews, long totalViews) {
        long weeklyViews = dailyViews.stream()
                .mapToLong(DashboardStatsResponse.DailyView::viewCount)
                .sum();
        if (weeklyViews > 0) {
            return "이번 주에 " + weeklyViews + "명이 당신의 글을 읽었어요.";
        }
        if (totalViews > 0) {
            return "지금까지 " + totalViews + "번 당신의 기록이 발견됐어요.";
        }
        return "첫 번째 조회가 쌓이는 순간을 기다리고 있어요.";
    }
}
