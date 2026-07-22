import test from "node:test";
import assert from "node:assert/strict";
import {
    applyAutoPairEdit,
    applyMarkdownAutocomplete,
    applyMarkdownShortcut,
    addColumnToMarkdownTable,
    addRowToMarkdownTable,
    createMarkdownTable,
    createMarkdownLink,
    indentSelection,
    moveMarkdownTableColumn,
    moveMarkdownTableRow,
    parseMarkdownTableBlock,
    updateMarkdownTableCell
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

test("Cmd+I wraps selected text with underscore italic markdown", () => {
    assert.deepEqual(applyMarkdownShortcut({
        value: "hello",
        start: 0,
        end: 5,
        key: "i",
        metaKey: true
    }), {
        value: "_hello_",
        start: 1,
        end: 6
    });
});

test("Cmd+X is reserved for cut and Cmd+Shift+X applies strikethrough", () => {
    assert.equal(applyMarkdownShortcut({
        value: "hello",
        start: 0,
        end: 5,
        key: "x",
        metaKey: true
    }), null);

    assert.deepEqual(applyMarkdownShortcut({
        value: "hello",
        start: 0,
        end: 5,
        key: "x",
        metaKey: true,
        shiftKey: true
    }), {
        value: "~~hello~~",
        start: 2,
        end: 7
    });
});

test("inline formatting shortcuts unwrap when cursor is inside formatted text", () => {
    assert.deepEqual(applyMarkdownShortcut({
        value: "**hello**",
        start: 4,
        end: 4,
        key: "b",
        metaKey: true
    }), {
        value: "hello",
        start: 2,
        end: 2
    });

    assert.deepEqual(applyMarkdownShortcut({
        value: "_hello_",
        start: 3,
        end: 3,
        key: "i",
        metaKey: true
    }), {
        value: "hello",
        start: 2,
        end: 2
    });

    assert.deepEqual(applyMarkdownShortcut({
        value: "~~hello~~",
        start: 4,
        end: 4,
        key: "x",
        metaKey: true,
        shiftKey: true
    }), {
        value: "hello",
        start: 2,
        end: 2
    });

    assert.deepEqual(applyMarkdownShortcut({
        value: "`hello`",
        start: 3,
        end: 3,
        key: "e",
        metaKey: true
    }), {
        value: "hello",
        start: 2,
        end: 2
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

test("Cmd+K inserts an empty link and focuses the right editable part", () => {
    assert.deepEqual(createMarkdownLink({
        value: "",
        start: 0,
        end: 0
    }), {
        value: "[링크]()",
        start: 1,
        end: 3
    });

    assert.deepEqual(applyMarkdownShortcut({
        value: "설명",
        start: 0,
        end: 2,
        key: "k",
        metaKey: true
    }), {
        value: "[설명]()",
        start: 5,
        end: 5
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
        value: "```\n\n```\n",
        start: 4,
        end: 4
    });
});

test("checkbox autocomplete cooperates with auto-paired brackets", () => {
    assert.deepEqual(applyMarkdownAutocomplete({
        value: "- [ ]",
        start: 4,
        end: 4,
        key: " "
    }), {
        value: "- [ ] ",
        start: 6,
        end: 6
    });
});

test("auto-pair skips existing closers and removes empty pairs together", () => {
    assert.deepEqual(applyAutoPairEdit({
        value: "",
        start: 0,
        end: 0,
        key: "["
    }), {
        value: "[]",
        start: 1,
        end: 1
    });

    assert.deepEqual(applyAutoPairEdit({
        value: "[]",
        start: 1,
        end: 1,
        key: "]"
    }), {
        value: "[]",
        start: 2,
        end: 2
    });

    assert.deepEqual(applyAutoPairEdit({
        value: "[]",
        start: 1,
        end: 1,
        key: "Backspace"
    }), {
        value: "",
        start: 0,
        end: 0
    });

    assert.deepEqual(applyAutoPairEdit({
        value: "\"\"",
        start: 1,
        end: 1,
        key: "\""
    }), {
        value: "\"\"",
        start: 2,
        end: 2
    });
});

test("third backtick turns an inline backtick pair into a code block shell", () => {
    assert.deepEqual(applyAutoPairEdit({
        value: "``",
        start: 1,
        end: 1,
        key: "`"
    }), {
        value: "```\n```",
        start: 3,
        end: 3
    });
});

test("/toggle autocomplete inserts a details block and selects the summary title", () => {
    const result = applyMarkdownAutocomplete({
        value: "/toggle ",
        start: 8,
        end: 8,
        key: " "
    });

    assert.equal(result.value, "<details>\n<summary>토글 제목</summary>\n\n내용을 입력하세요.\n\n</details>");
    assert.equal(result.value.slice(result.start, result.end), "토글 제목");
});

test("/toggle with heading marker keeps the marker in the details summary", () => {
    const result = applyMarkdownAutocomplete({
        value: "/toggle ## ",
        start: 11,
        end: 11,
        key: " "
    });

    assert.equal(result.value, "<details>\n<summary>## 토글 제목</summary>\n\n내용을 입력하세요.\n\n</details>");
    assert.equal(result.value.slice(result.start, result.end), "토글 제목");
});

test("checkbox list autocomplete keeps checkbox markers", () => {
    assert.deepEqual(applyMarkdownAutocomplete({
        value: "- [ ] 할 일",
        start: 9,
        end: 9,
        key: "Enter"
    }), {
        value: "- [ ] 할 일\n- [ ] ",
        start: 16,
        end: 16
    });

    assert.deepEqual(applyMarkdownAutocomplete({
        value: "-[] 빠른 할 일",
        start: 10,
        end: 10,
        key: "Enter"
    }), {
        value: "-[] 빠른 할 일\n- [ ] ",
        start: 17,
        end: 17
    });

    assert.deepEqual(applyMarkdownAutocomplete({
        value: "    - [x] 완료",
        start: 13,
        end: 13,
        key: "Enter"
    }), {
        value: "    - [x] 완료\n    - [ ] ",
        start: 24,
        end: 24
    });

    assert.deepEqual(applyMarkdownAutocomplete({
        value: "- [ ] 할 일",
        start: 9,
        end: 9,
        key: "Enter",
        shiftKey: true
    }), {
        value: "- [ ] 할 일\n      ",
        start: 16,
        end: 16
    });
});

test("Tab indents compact checkbox list lines by four spaces", () => {
    assert.deepEqual(indentSelection({
        value: "-[] 할 일",
        start: 0,
        end: 7,
        outdent: false
    }).value, "    -[] 할 일");
});

test("Tab indents and Shift+Tab outdents selected list lines", () => {
    assert.deepEqual(indentSelection({
        value: "- a\n- b",
        start: 0,
        end: 7,
        outdent: false
    }).value, "    - a\n    - b");

    assert.deepEqual(indentSelection({
        value: "    - a\n    - b",
        start: 0,
        end: 15,
        outdent: true
    }).value, "- a\n- b");
});

test("Tab indents blockquote and fenced code block lines", () => {
    assert.deepEqual(indentSelection({
        value: "> quote\n> next",
        start: 0,
        end: 14,
        outdent: false
    }).value, ">     quote\n>     next");

    assert.deepEqual(indentSelection({
        value: "```\ncode\n```",
        start: 0,
        end: 12,
        outdent: false
    }).value, "    ```\n    code\n    ```");
});

test("Shift+Enter keeps the cursor inside list and blockquote content", () => {
    assert.deepEqual(applyMarkdownAutocomplete({
        value: "- 목록",
        start: 4,
        end: 4,
        key: "Enter",
        shiftKey: true
    }), {
        value: "- 목록\n  ",
        start: 7,
        end: 7
    });

    assert.deepEqual(applyMarkdownAutocomplete({
        value: "    - 하위",
        start: 8,
        end: 8,
        key: "Enter",
        shiftKey: true
    }), {
        value: "    - 하위\n      ",
        start: 15,
        end: 15
    });

    assert.deepEqual(applyMarkdownAutocomplete({
        value: "    > 인용",
        start: 8,
        end: 8,
        key: "Enter",
        shiftKey: true
    }), {
        value: "    > 인용\n    > ",
        start: 15,
        end: 15
    });

    const nestedQuoteList = ">     - 하위";
    const nestedQuoteListResult = `${nestedQuoteList}\n>       `;
    assert.deepEqual(applyMarkdownAutocomplete({
        value: nestedQuoteList,
        start: nestedQuoteList.length,
        end: nestedQuoteList.length,
        key: "Enter",
        shiftKey: true
    }), {
        value: nestedQuoteListResult,
        start: nestedQuoteListResult.length,
        end: nestedQuoteListResult.length
    });
});

test("Enter keeps indentation around fenced code blocks", () => {
    assert.deepEqual(applyMarkdownAutocomplete({
        value: "    ```java",
        start: 11,
        end: 11,
        key: "Enter"
    }), {
        value: "    ```java\n    \n    ```\n",
        start: 16,
        end: 16
    });

    assert.deepEqual(applyMarkdownAutocomplete({
        value: "```\n    code",
        start: 12,
        end: 12,
        key: "Enter"
    }), {
        value: "```\n    code\n    ",
        start: 17,
        end: 17
    });

    assert.deepEqual(applyMarkdownAutocomplete({
        value: "```java\n```",
        start: 7,
        end: 7,
        key: "Enter"
    }), {
        value: "```java\n\n```",
        start: 8,
        end: 8
    });

    assert.deepEqual(applyMarkdownAutocomplete({
        value: "    ```java\n    ```",
        start: 11,
        end: 11,
        key: "Enter"
    }), {
        value: "    ```java\n    \n    ```",
        start: 16,
        end: 16
    });

    assert.deepEqual(applyMarkdownAutocomplete({
        value: "``````",
        start: 3,
        end: 3,
        key: "Enter"
    }), {
        value: "```\n```",
        start: 4,
        end: 4
    });

    const closedBlock = "```\ncode\n```";
    assert.deepEqual(applyMarkdownAutocomplete({
        value: closedBlock,
        start: closedBlock.length,
        end: closedBlock.length,
        key: "Enter"
    }), {
        value: `${closedBlock}\n`,
        start: closedBlock.length + 1,
        end: closedBlock.length + 1
    });
});

test("Enter continues list markers inside blockquotes", () => {
    const source = ">     - 하위";
    const nextLine = `${source}\n>     - `;

    assert.deepEqual(applyMarkdownAutocomplete({
        value: source,
        start: source.length,
        end: source.length,
        key: "Enter"
    }), {
        value: nextLine,
        start: nextLine.length,
        end: nextLine.length
    });
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

test("parseMarkdownTableBlock returns an editable table model", () => {
    assert.deepEqual(parseMarkdownTableBlock({
        value: "앞 문장\n| 제목 | 설명 |\n| --- | --- |\n| 항목 | 내용 |\n뒤 문장",
        start: 14
    }), {
        start: 5,
        end: 42,
        header: ["제목", "설명"],
        rows: [["항목", "내용"]],
        columnCount: 2
    });
});

test("updateMarkdownTableCell changes one visual table cell in markdown source", () => {
    assert.deepEqual(updateMarkdownTableCell({
        value: "| 제목 | 설명 |\n| --- | --- |\n| 항목 | 내용 |",
        start: 4,
        rowIndex: 0,
        columnIndex: 1,
        text: "바뀐 내용"
    }), {
        value: "| 제목 | 설명 |\n| --- | --- |\n| 항목 | 바뀐 내용 |",
        start: 4,
        end: 4
    });

    assert.deepEqual(updateMarkdownTableCell({
        value: "| 제목 | 설명 |\n| --- | --- |\n| 항목 | 내용 |",
        start: 4,
        rowIndex: -1,
        columnIndex: 0,
        text: "새 제목"
    }), {
        value: "| 새 제목 | 설명 |\n| --- | --- |\n| 항목 | 내용 |",
        start: 4,
        end: 4
    });
});

test("moveMarkdownTableColumn swaps visual table columns in markdown source", () => {
    assert.deepEqual(moveMarkdownTableColumn({
        value: "| 제목 | 설명 | 새 열 |\n| --- | --- | --- |\n| 항목 | 내용 | 기타 |",
        start: 6,
        fromIndex: 2,
        toIndex: 0
    }), {
        value: "| 새 열 | 제목 | 설명 |\n| --- | --- | --- |\n| 기타 | 항목 | 내용 |",
        start: 6,
        end: 6
    });
});

test("moveMarkdownTableRow swaps visual body rows in markdown source", () => {
    assert.deepEqual(moveMarkdownTableRow({
        value: "| 제목 | 설명 |\n| --- | --- |\n| 첫째 | 내용 |\n| 둘째 | 내용 |",
        start: 34,
        fromIndex: 1,
        toIndex: 0
    }), {
        value: "| 제목 | 설명 |\n| --- | --- |\n| 둘째 | 내용 |\n| 첫째 | 내용 |",
        start: 34,
        end: 34
    });
});
