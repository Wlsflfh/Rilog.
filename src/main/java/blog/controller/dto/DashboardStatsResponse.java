package blog.controller.dto;

import java.time.LocalDate;
import java.util.List;

public record DashboardStatsResponse(
        Summary summary,
        List<DailyView> dailyViews,
        List<TopPost> topViewedPosts,
        List<TopPost> topLikedPosts,
        List<TopPost> topCommentedPosts,
        String insightMessage
) {

    public record Summary(
            long postCount,
            long totalViews,
            long totalLikes,
            long totalComments
    ) {
    }

    public record DailyView(
            LocalDate date,
            long viewCount
    ) {
    }

    public record TopPost(
            Long id,
            String title,
            String slug,
            long viewCount,
            long likeCount,
            long commentCount
    ) {
    }
}
