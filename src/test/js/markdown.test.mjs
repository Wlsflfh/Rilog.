import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {
    extractHeadings,
    normalizeHexColor
} from "../../main/resources/static/js/markdown.js";

test("#부터 ####까지 추출하고 중복 제목에 고유 ID를 만든다", () => {
    assert.deepEqual(extractHeadings("# A\n## B\n#### C\n##### 제외\n# A"), [
        {level: 1, text: "A", id: "a"},
        {level: 2, text: "B", id: "b"},
        {level: 4, text: "C", id: "c"},
        {level: 1, text: "A", id: "a-2"}
    ]);
});

test("코드 블록 안의 제목은 목차에서 제외한다", () => {
    assert.deepEqual(extractHeadings("```md\n# code\n```\n## real"), [
        {level: 2, text: "real", id: "real"}
    ]);
});

test("제목의 Markdown 서식은 목차 텍스트에서 제거한다", () => {
    assert.deepEqual(extractHeadings("# **굵은** `제목`"), [
        {level: 1, text: "굵은 제목", id: "굵은-제목"}
    ]);
});

test("RGB와 RRGGBB 형식만 정규화한다", () => {
    assert.equal(normalizeHexColor("#07f"), "#0077ff");
    assert.equal(normalizeHexColor("#071047"), "#071047");
    assert.equal(normalizeHexColor("red"), null);
    assert.equal(normalizeHexColor("#12345g"), null);
});

test("취소선과 밑줄 인라인 마크다운을 렌더링한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const result = spawnSync(process.execPath, [fixture, "~~삭제~~ <u>밑줄</u>"], {timeout: 300});

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(result.stdout.toString(), /<del>삭제<\/del>/);
    assert.match(result.stdout.toString(), /<u>밑줄<\/u>/);
});

test("Markdown 표를 table 요소로 렌더링한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const source = "| 제목 | 설명 |\n| --- | --- |\n| 항목 | 내용 |";
    const result = spawnSync(process.execPath, [fixture, source], {timeout: 300});

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(result.stdout.toString(), /<table>/);
    assert.match(result.stdout.toString(), /<thead><tr><th>제목<\/th><th>설명<\/th><\/tr><\/thead>/);
    assert.match(result.stdout.toString(), /<tbody><tr><td>항목<\/td><td>내용<\/td><\/tr><\/tbody>/);
});

test("문단 안의 줄바꿈을 br 요소로 렌더링한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const result = spawnSync(process.execPath, [fixture, "첫 줄\n둘째 줄"], {timeout: 300});

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(result.stdout.toString(), /첫 줄<br><\/br>둘째 줄/);
});

test("명시적인 br 태그를 줄바꿈으로 렌더링한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const result = spawnSync(process.execPath, [fixture, "첫 줄<br>둘째 줄"], {timeout: 300});

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(result.stdout.toString(), /첫 줄<br><\/br>둘째 줄/);
});

test("Markdown 이미지 문법을 img 요소로 렌더링한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const result = spawnSync(process.execPath, [fixture, "![image](/uploads/sample.png)"], {timeout: 300});

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(result.stdout.toString(), /<img src="http:\/\/localhost\/uploads\/sample\.png" alt="image"><\/img>/);
});

test("연속된 Markdown 이미지를 그리드로 렌더링한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const source = "![one](/uploads/one.png)\n![two](/uploads/two.png)\n![three](/uploads/three.png)";
    const result = spawnSync(process.execPath, [fixture, source], {timeout: 300});

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(result.stdout.toString(), /<div class="image-grid image-grid-3">/);
    assert.match(result.stdout.toString(), /alt="one"/);
    assert.match(result.stdout.toString(), /alt="two"/);
    assert.match(result.stdout.toString(), /alt="three"/);
});

test("작성 중인 빈 Markdown 블록에서도 렌더링을 종료한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));

    for (const marker of ["# ", "## ", "- ", "1. "]) {
        const source = `앞 문단\n\n${marker}`;
        const result = spawnSync(process.execPath, [fixture, source], {timeout: 300});
        assert.equal(result.status, 0, `${JSON.stringify(marker)} 렌더링이 종료되지 않았습니다: ${result.error || result.stderr}`);
    }
});
