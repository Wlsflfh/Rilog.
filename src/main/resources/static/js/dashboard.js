export function formatStatNumber(value) {
    return new Intl.NumberFormat("ko-KR").format(value || 0);
}

export function barWidth(value, max) {
    if (!max) return "0%";
    return `${Math.round((value / max) * 100)}%`;
}

export function createInsightMessage(stats) {
    const weeklyViews = (stats.dailyViews || [])
            .reduce((sum, item) => sum + (item.viewCount || 0), 0);
    if (weeklyViews > 0) {
        return `이번 주에 ${formatStatNumber(weeklyViews)}명이 당신의 글을 읽었어요.`;
    }
    if (stats.summary?.totalViews > 0) {
        return `지금까지 ${formatStatNumber(stats.summary.totalViews)}번 당신의 기록이 발견됐어요.`;
    }
    return "첫 번째 조회가 쌓이는 순간을 기다리고 있어요.";
}
