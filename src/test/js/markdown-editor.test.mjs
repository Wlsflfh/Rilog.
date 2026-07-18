import test from "node:test";
import assert from "node:assert/strict";
import {
    applyMarkdownAutocomplete,
    applyMarkdownShortcut,
    addColumnToMarkdownTable,
    addRowToMarkdownTable,
    createMarkdownTable,
    indentSelection
} from "../../main/resources/static/js/markdown-editor.js";

test("Cmd+B wraps selected text with bold markdown", () => {
    assert.deepEqual(applyMarkdownShortcut({
        value: "hello",
        start: 0,
        end: 5,
        key: "b",
        metaKey: true
    }), {
        value: "**hello**",
        start: 2,
        end: 7
    });
});

test("Cmd+Option+3 turns current line into level 3 heading", () => {
    assert.deepEqual(applyMarkdownShortcut({
        value: "제목",
        start: 2,
        end: 2,
        key: "3",
        metaKey: true,
        altKey: true
    }), {
        value: "### 제목",
        start: 6,
        end: 6
    });
});

test("Cmd+Shift+7 toggles ordered list marker on current line", () => {
    assert.deepEqual(applyMarkdownShortcut({
        value: "목록",
        start: 0,
        end: 0,
        key: "7",
        metaKey: true,
        shiftKey: true
    }), {
        value: "1. 목록",
        start: 3,
        end: 3
    });
});

test("markdown autocomplete expands block triggers", () => {
    assert.deepEqual(applyMarkdownAutocomplete({
        value: "[] ",
        start: 3,
        end: 3
    }), {
        value: "- [ ] ",
        start: 6,
        end: 6
    });

    assert.deepEqual(applyMarkdownAutocomplete({
        value: "```",
        start: 3,
        end: 3,
        key: "Enter"
    }), {
        value: "```\n\n```",
        start: 4,
        end: 4
    });
});

test("Tab indents and Shift+Tab outdents selected list lines", () => {
    assert.deepEqual(indentSelection({
        value: "- a\n- b",
        start: 0,
        end: 7,
        outdent: false
    }).value, "  - a\n  - b");

    assert.deepEqual(indentSelection({
        value: "  - a\n  - b",
        start: 0,
        end: 11,
        outdent: true
    }).value, "- a\n- b");
});

test("createMarkdownTable returns a basic editable table block", () => {
    assert.equal(createMarkdownTable(), "\n| 제목 | 설명 |\n| --- | --- |\n| 항목 | 내용 |\n");
});

test("addColumnToMarkdownTable adds a column to the table around cursor", () => {
    assert.deepEqual(addColumnToMarkdownTable({
        value: "| 제목 | 설명 |\n| --- | --- |\n| 항목 | 내용 |",
        start: 4,
        end: 4
    }), {
        value: "| 제목 | 설명 | 새 열 |\n| --- | --- | --- |\n| 항목 | 내용 |  |",
        start: 4,
        end: 4
    });
});

test("addRowToMarkdownTable adds a body row to the table around cursor", () => {
    assert.deepEqual(addRowToMarkdownTable({
        value: "| 제목 | 설명 |\n| --- | --- |\n| 항목 | 내용 |",
        start: 28,
        end: 28
    }), {
        value: "| 제목 | 설명 |\n| --- | --- |\n| 항목 | 내용 |\n|  |  |",
        start: 28,
        end: 28
    });
});
