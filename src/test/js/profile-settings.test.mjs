import test from "node:test";
import assert from "node:assert/strict";
import {createBlogUrl, normalizeProfilePayload, safeExternalUrl} from "../../main/resources/static/js/profile-settings.js";

test("normalizeProfilePayload trims values and turns blanks into null", () => {
    assert.deepEqual(normalizeProfilePayload({
        bio: "  Spring 기록 ",
        githubUrl: "   ",
        websiteUrl: " https://rilog.dev ",
        techStack: " Java, JPA "
    }), {
        bio: "Spring 기록",
        githubUrl: null,
        websiteUrl: "https://rilog.dev",
        techStack: "Java, JPA"
    });
});

test("createBlogUrl builds a hash route blog url", () => {
    assert.equal(createBlogUrl("http://localhost:8080", "jinriro"), "http://localhost:8080/#/@jinriro");
});

test("safeExternalUrl allows only http and https links", () => {
    assert.equal(safeExternalUrl("https://github.com/jinriro"), "https://github.com/jinriro");
    assert.equal(safeExternalUrl("http://example.com"), "http://example.com/");
    assert.equal(safeExternalUrl("javascript:alert(1)"), null);
    assert.equal(safeExternalUrl("not a url"), null);
});
