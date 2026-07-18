import test from "node:test";
import assert from "node:assert/strict";
import {barWidth, createInsightMessage, formatStatNumber} from "../../main/resources/static/js/dashboard.js";

test("barWidth returns percentage based on max value", () => {
    assert.equal(barWidth(5, 10), "50%");
    assert.equal(barWidth(0, 10), "0%");
    assert.equal(barWidth(3, 0), "0%");
});

test("createInsightMessage prefers weekly views, then total views, then empty state", () => {
    assert.equal(createInsightMessage({
        summary: {totalViews: 100},
        dailyViews: [{viewCount: 2}, {viewCount: 3}]
    }), "이번 주에 5명이 당신의 글을 읽었어요.");
    assert.equal(createInsightMessage({
        summary: {totalViews: 12},
        dailyViews: [{viewCount: 0}]
    }), "지금까지 12번 당신의 기록이 발견됐어요.");
    assert.equal(createInsightMessage({
        summary: {totalViews: 0},
        dailyViews: []
    }), "첫 번째 조회가 쌓이는 순간을 기다리고 있어요.");
});

test("formatStatNumber uses Korean locale separators", () => {
    assert.equal(formatStatNumber(12345), "12,345");
});
