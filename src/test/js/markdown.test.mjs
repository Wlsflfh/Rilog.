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

test("#부터 #### 제목은 일반 제목으로 렌더링한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const source = "# 큰 제목\n본문\n#### 작은 제목\n내용";
    const result = spawnSync(process.execPath, [fixture, source], {timeout: 300});
    const html = result.stdout.toString();

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(html, /<h1 id="큰-제목">큰 제목<\/h1>/);
    assert.match(html, /<h4 id="작은-제목">작은 제목<\/h4>/);
    assert.doesNotMatch(html, /markdown-toggle-heading|markdown-heading-toggle/);
});

test("/toggle details block renders an explicit collapsible section", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const source = "<details>\n<summary># 토글 제목</summary>\n\n내용\n\n</details>";
    const result = spawnSync(process.execPath, [fixture, source], {timeout: 300});
    const html = result.stdout.toString();

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(html, /<details class="markdown-toggle"><summary class="markdown-toggle-summary markdown-toggle-summary-h1">토글 제목<\/summary><div class="markdown-body markdown-toggle-content"><p>내용<\/p><\/div><\/details>/);
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

test("밑줄 기호로 작성한 기울임을 렌더링한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const result = spawnSync(process.execPath, [fixture, "_기울임_"], {timeout: 300});

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(result.stdout.toString(), /<em>기울임<\/em>/);
});

test("중첩된 인라인 마크다운을 함께 렌더링한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const result = spawnSync(process.execPath, [fixture, "**<u>_텍스트_</u>**"], {timeout: 300});

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(result.stdout.toString(), /<strong><u><em>텍스트<\/em><\/u><\/strong>/);
});

test("탭으로 들여쓴 인용문과 코드블록도 블록으로 렌더링한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const source = "    > 인용\n\n    ```java\n    int value = 1;\n    ```";
    const result = spawnSync(process.execPath, [fixture, source], {timeout: 300});

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(result.stdout.toString(), /<blockquote class="markdown-indent-1"><p>인용<\/p><\/blockquote>/);
    assert.match(result.stdout.toString(), /<pre class="markdown-indent-1"><code class="language-java">int value = 1;<\/code><\/pre>/);
});

test("인용문 안의 목록을 중첩 블록으로 렌더링한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const source = "> 인용\n>     - 하위\n>     - 둘째";
    const result = spawnSync(process.execPath, [fixture, source], {timeout: 300});

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(result.stdout.toString(), /<blockquote><p>인용<\/p><ul><li>하위<\/li><li>둘째<\/li><\/ul><\/blockquote>/);
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

test("Markdown 체크박스 목록을 input 요소로 렌더링한다", () => {
    const fixture = fileURLToPath(new URL("./markdown-render-fixture.mjs", import.meta.url));
    const source = "- [ ] 할 일\n- [x] 끝난 일\n- [X] 대문자 완료\n-[] 빠른 입력\n    -[] 들여쓴 입력";
    const result = spawnSync(process.execPath, [fixture, source], {timeout: 300});
    const html = result.stdout.toString();

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(html, /<li class="task-list-item"><input type="checkbox" disabled><\/input><span class="task-list-content">할 일<\/span><\/li>/);
    assert.match(html, /<li class="task-list-item"><input type="checkbox" checked disabled><\/input><span class="task-list-content">끝난 일<\/span><\/li>/);
    assert.match(html, /<li class="task-list-item"><input type="checkbox" checked disabled><\/input><span class="task-list-content">대문자 완료<\/span><\/li>/);
    assert.match(html, /<li class="task-list-item"><input type="checkbox" disabled><\/input><span class="task-list-content">빠른 입력<\/span><ul>/);
    assert.match(html, /<li class="task-list-item"><input type="checkbox" disabled><\/input><span class="task-list-content">들여쓴 입력<\/span><\/li>/);
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
