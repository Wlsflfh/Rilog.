const INLINE_SHORTCUTS = new Map([
    ["b", ["**", "**", "텍스트"]],
    ["i", ["_", "_", "텍스트"]],
    ["u", ["<u>", "</u>", "텍스트"]],
    ["e", ["`", "`", "코드"]]
]);
const INDENT = "    ";
const AUTO_PAIRS = new Map([
    ["`", "`"],
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
    ["\"", "\""],
    ["'", "'"]
]);
const AUTO_OPENERS_BY_CLOSER = new Map(
    Array.from(AUTO_PAIRS.entries()).map(([opener, closer]) => [closer, opener])
);

function lineBounds(value, position) {
    const start = value.lastIndexOf("\n", Math.max(0, position - 1)) + 1;
    const endIndex = value.indexOf("\n", position);
    return {start, end: endIndex === -1 ? value.length : endIndex};
}

function replaceRange(value, start, end, replacement, selectionStart, selectionEnd = selectionStart) {
    return {
        value: value.slice(0, start) + replacement + value.slice(end),
        start: selectionStart,
        end: selectionEnd
    };
}

function wrapSelection({value, start, end}, before, after, placeholder) {
    const selected = value.slice(start, end) || placeholder;
    return replaceRange(value, start, end, `${before}${selected}${after}`, start + before.length, start + before.length + selected.length);
}

export function createMarkdownLink({value, start, end}) {
    const selected = value.slice(start, end);
    const label = selected || "링크";
    const replacement = `[${label}]()`;
    const cursor = start + label.length + 3;

    if (selected) {
        return replaceRange(value, start, end, replacement, cursor);
    }
    return replaceRange(value, start, end, replacement, start + 1, start + 1 + label.length);
}

function inlineWrapperRanges(value, before, after) {
    const ranges = [];
    let searchFrom = 0;

    while (searchFrom < value.length) {
        const openStart = value.indexOf(before, searchFrom);
        if (openStart === -1) break;

        const contentStart = openStart + before.length;
        const closeStart = value.indexOf(after, contentStart);
        if (closeStart === -1) break;

        ranges.push({
            openStart,
            contentStart,
            contentEnd: closeStart,
            closeEnd: closeStart + after.length
        });
        searchFrom = closeStart + after.length;
    }

    return ranges;
}

function findInlineWrapperAtSelection(value, start, end, before, after) {
    return inlineWrapperRanges(value, before, after).find(range => {
        const selectionIncludesWrapper = start === range.openStart && end === range.closeEnd;
        const selectionInsideWrapper = start >= range.contentStart && end <= range.contentEnd;
        return selectionIncludesWrapper || selectionInsideWrapper;
    }) || null;
}

function unwrapInlineMarkdown(value, start, end, wrapper) {
    const inner = value.slice(wrapper.contentStart, wrapper.contentEnd);
    const nextStart = wrapper.openStart + Math.min(inner.length, Math.max(0, start - wrapper.contentStart));
    const nextEnd = wrapper.openStart + Math.min(inner.length, Math.max(0, end - wrapper.contentStart));
    return replaceRange(value, wrapper.openStart, wrapper.closeEnd, inner, nextStart, nextEnd);
}

function toggleWrapSelection(state, before, after, placeholder) {
    const wrapper = findInlineWrapperAtSelection(state.value, state.start, state.end, before, after);
    if (wrapper) {
        return unwrapInlineMarkdown(state.value, state.start, state.end, wrapper);
    }
    return wrapSelection(state, before, after, placeholder);
}

function prefixCurrentLine(state, prefix, stripPattern = /^\s*(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s+)/) {
    const bounds = lineBounds(state.value, state.start);
    const line = state.value.slice(bounds.start, bounds.end);
    const cleaned = line.replace(stripPattern, "");
    const replacement = `${prefix}${cleaned}`;
    const cursor = bounds.start + prefix.length + Math.max(0, state.start - bounds.start - (line.length - cleaned.length));
    return replaceRange(state.value, bounds.start, bounds.end, replacement, cursor);
}

function nextListNumber(marker) {
    const number = /^(\s*)(\d+)\.\s+$/.exec(marker);
    if (!number) return marker;
    return `${number[1]}${Number(number[2]) + 1}. `;
}

function taskListLine(line) {
    return /^((?:\s*>\s*)*\s*)((?:[-*+])|(?:\d+\.))\s*\[([ xX]?)]\s*(.*)$/.exec(line);
}

function taskListHasContent(line) {
    const taskList = taskListLine(line);
    return Boolean(taskList && taskList[4].trim());
}

function nextTaskListMarker(taskList) {
    const listMarker = nextListMarker(taskList[1], taskList[2]);
    return `${listMarker}[ ] `;
}

function listLine(line) {
    return /^((?:\s*>\s*)*\s*)((?:[-*+])|(?:\d+\.))\s+(.+)$/.exec(line);
}

function nextListMarker(prefix, marker) {
    if (/^\d+\.$/.test(marker)) {
        return `${prefix}${Number(marker.slice(0, -1)) + 1}. `;
    }
    return `${prefix}${marker} `;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasClosingFenceAfterCursor(value, position, indent, lineEnd = "") {
    if (lineEnd.startsWith("```")) return true;

    const closingFence = new RegExp(`^${escapeRegExp(indent)}\`\`\``);
    return value
        .slice(position)
        .split("\n")
        .slice(1)
        .some(tailLine => closingFence.test(tailLine));
}

function isInsideFencedCodeBlock(value, lineStart) {
    const previousLines = value.slice(0, lineStart).split("\n");
    let insideFence = false;

    previousLines.forEach(previousLine => {
        if (/^\s*```/.test(previousLine)) {
            insideFence = !insideFence;
        }
    });

    return insideFence;
}

export function applyMarkdownShortcut(state) {
    const key = String(state.key || "").toLowerCase();
    const commandKey = state.metaKey || state.ctrlKey;
    if (!commandKey) return null;

    if (state.altKey && /^[1-6]$/.test(key)) {
        return prefixCurrentLine(state, `${"#".repeat(Number(key))} `);
    }

    if (state.shiftKey && key === "7") {
        return prefixCurrentLine(state, "1. ");
    }
    if (state.shiftKey && key === "8") {
        return prefixCurrentLine(state, "- ");
    }
    if (state.shiftKey && key === "9") {
        return prefixCurrentLine(state, "> ");
    }
    if (state.shiftKey && key === "c") {
        return wrapSelection(state, "```\n", "\n```", "code");
    }
    if (state.shiftKey && key === "x") {
        return toggleWrapSelection(state, "~~", "~~", "텍스트");
    }
    if (key === "k") {
        return createMarkdownLink(state);
    }
    if (INLINE_SHORTCUTS.has(key)) {
        return toggleWrapSelection(state, ...INLINE_SHORTCUTS.get(key));
    }
    return null;
}

export function applyMarkdownAutocomplete(state) {
    const bounds = lineBounds(state.value, state.start);
    const line = state.value.slice(bounds.start, state.start);
    const lineEnd = state.value.slice(state.start, bounds.end);
    const key = state.key || " ";

    if (key === "Enter" && state.shiftKey) {
        const taskListContent = taskListLine(line);
        if (taskListContent && taskListHasContent(line)) {
            const markerWidth = `${taskListContent[2]} [ ] `.length;
            const replacement = `\n${taskListContent[1]}${" ".repeat(markerWidth)}`;
            return replaceRange(state.value, state.start, state.start, replacement, state.start + replacement.length);
        }

        const listContent = listLine(line);
        if (listContent) {
            const markerWidth = `${listContent[2]} `.length;
            const replacement = `\n${listContent[1]}${" ".repeat(markerWidth)}`;
            return replaceRange(state.value, state.start, state.start, replacement, state.start + replacement.length);
        }

        const quoteContent = /^(\s*>\s+).+/.exec(line);
        if (quoteContent) {
            const replacement = `\n${quoteContent[1]}`;
            return replaceRange(state.value, state.start, state.start, replacement, state.start + replacement.length);
        }

        return null;
    }

    if (key === "Enter") {
        const openingFence = /^(\s*)```[\w#+.-]*$/.exec(line);
        if (openingFence) {
            const indent = openingFence[1];
            if (isInsideFencedCodeBlock(state.value, bounds.start)) {
                const replacement = `\n${indent}`;
                return replaceRange(state.value, state.start, state.start, replacement, state.start + replacement.length);
            }
            if (hasClosingFenceAfterCursor(state.value, state.start, indent, lineEnd)) {
                const replacement = `\n${indent}`;
                return replaceRange(state.value, state.start, state.start, replacement, state.start + replacement.length);
            }
            const replacement = `${line}\n${indent}\n${indent}\`\`\`\n`;
            return replaceRange(state.value, bounds.start, state.start, replacement, bounds.start + line.length + 1 + indent.length);
        }

        if (isInsideFencedCodeBlock(state.value, bounds.start) && !/^\s*```/.test(line)) {
            const indent = /^(\s*)/.exec(line)?.[1] || "";
            const replacement = `\n${indent}`;
            return replaceRange(state.value, state.start, state.start, replacement, state.start + replacement.length);
        }
    }
    if (key === "Enter" && line === "---") {
        return replaceRange(state.value, bounds.start, state.start, "---\n", bounds.start + 4);
    }
    if (key === "Enter") {
        const quote = /^(\s*)>\s*$/.exec(line);
        if (quote) {
            return replaceRange(state.value, bounds.start, state.start, quote[1], bounds.start + quote[1].length);
        }

        const emptyTaskList = /^((?:\s*>\s*)*\s*)((?:[-*+])|(?:\d+\.))\s*\[[ xX]?]\s*$/.exec(line);
        if (emptyTaskList) {
            return replaceRange(state.value, bounds.start, state.start, emptyTaskList[1], bounds.start + emptyTaskList[1].length);
        }

        const emptyList = /^((?:\s*>\s*)*\s*)((?:[-*+])|(?:\d+\.))\s*$/.exec(line);
        if (emptyList) {
            return replaceRange(state.value, bounds.start, state.start, emptyList[1], bounds.start + emptyList[1].length);
        }

        const taskListContent = taskListLine(line);
        if (taskListContent && taskListHasContent(line)) {
            const marker = nextTaskListMarker(taskListContent);
            const replacement = `\n${marker}`;
            return replaceRange(state.value, state.start, state.start, replacement, state.start + replacement.length);
        }

        const listContent = listLine(line);
        if (listContent) {
            const marker = nextListMarker(listContent[1], listContent[2]);
            const replacement = `\n${marker}`;
            return replaceRange(state.value, state.start, state.start, replacement, state.start + replacement.length);
        }

        const quoteContent = /^(\s*>\s+).+/.exec(line);
        if (quoteContent) {
            const replacement = `\n${quoteContent[1]}`;
            return replaceRange(state.value, state.start, state.start, replacement, state.start + replacement.length);
        }
    }
    if (key !== " ") return null;

    const toggleCommand = /^\/toggle(?:\s+(#{1,4}))?\s$/.exec(line);
    if (toggleCommand) {
        const headingPrefix = toggleCommand[1] ? `${toggleCommand[1]} ` : "";
        const title = "토글 제목";
        const summary = `${headingPrefix}${title}`;
        const replacement = `<details>\n<summary>${summary}</summary>\n\n내용을 입력하세요.\n\n</details>`;
        const selectionStart = bounds.start + `<details>\n<summary>${headingPrefix}`.length;
        return replaceRange(
            state.value,
            bounds.start,
            state.start,
            replacement,
            selectionStart,
            selectionStart + title.length
        );
    }

    if (/^\/(?:therefore|thus)\s$/i.test(line)) {
        return replaceRange(state.value, bounds.start, state.start, "∴ ", bounds.start + 2);
    }

    if (/^((?:\s*>\s*)*\s*)((?:[-*+])|(?:\d+\.))\s+\[\s$/.test(line) && lineEnd.startsWith("]")) {
        const replacement = `${line}] `;
        return replaceRange(state.value, bounds.start, state.start + 1, replacement, bounds.start + replacement.length);
    }

    const replacements = new Map([
        ["# ", "# "],
        ["## ", "## "],
        ["### ", "### "],
        ["#### ", "#### "],
        ["+ ", "- "],
        ["- ", "- "],
        ["1. ", "1. "],
        ["> ", "> "],
        ["[] ", "- [ ] "]
    ]);
    if (!replacements.has(line)) return null;
    const replacement = replacements.get(line);
    return replaceRange(state.value, bounds.start, state.start, replacement, bounds.start + replacement.length);
}

export function applyAutoPairEdit(state) {
    if (state.metaKey || state.ctrlKey || state.altKey) return null;

    const hasSelection = state.start !== state.end;

    if (!hasSelection && state.key === "`" && state.value[state.start - 1] === "`" && state.value[state.start] === "`") {
        const bounds = lineBounds(state.value, state.start);
        const beforeCursor = state.value.slice(bounds.start, state.start);
        const indent = /^(\s*)`$/.exec(beforeCursor)?.[1];
        if (indent !== undefined) {
            const replacement = `${indent}\`\`\`\n${indent}\`\`\``;
            return replaceRange(state.value, bounds.start, state.start + 1, replacement, bounds.start + indent.length + 3);
        }
        return replaceRange(state.value, state.start - 1, state.start + 1, "```\n```", state.start + 2);
    }

    if (!hasSelection && AUTO_OPENERS_BY_CLOSER.has(state.key) && state.value[state.start] === state.key) {
        return replaceRange(state.value, state.start, state.start, "", state.start + 1);
    }

    if (!hasSelection && state.key === "Backspace") {
        const before = state.value[state.start - 1];
        const after = state.value[state.start];
        if (AUTO_PAIRS.get(before) === after) {
            return replaceRange(state.value, state.start - 1, state.start + 1, "", state.start - 1);
        }
        return null;
    }

    if (!AUTO_PAIRS.has(state.key)) return null;

    const closer = AUTO_PAIRS.get(state.key);
    const selected = state.value.slice(state.start, state.end);
    return replaceRange(
        state.value,
        state.start,
        state.end,
        `${state.key}${selected}${closer}`,
        state.start + state.key.length,
        state.start + state.key.length + selected.length
    );
}

export function indentSelection({value, start, end, outdent = false}) {
    const selectionStartLine = lineBounds(value, start).start;
    const selectionEndLine = lineBounds(value, end).end;
    const block = value.slice(selectionStartLine, selectionEndLine);
    const lines = block.split("\n");
    const changed = lines.map(line => {
        if (!outdent) {
            if (!line) return line;
            return `${INDENT}${line}`;
        }
        if (line.startsWith(INDENT)) return line.slice(INDENT.length);
        if (line.startsWith("\t")) return line.slice(1);
        const partialIndent = /^ {1,3}/.exec(line);
        return partialIndent ? line.slice(partialIndent[0].length) : line;
    }).join("\n");
    const delta = changed.length - block.length;
    return replaceRange(value, selectionStartLine, selectionEndLine, changed, Math.max(selectionStartLine, start + (outdent ? Math.min(0, delta) : INDENT.length)), Math.max(selectionStartLine, end + delta));
}

export function createMarkdownTable() {
    return "\n| 제목 | 설명 |\n| --- | --- |\n| 항목 | 내용 |\n";
}

function tableCells(line) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
    return trimmed
        .slice(1, -1)
        .split("|")
        .map(cell => cell.trim());
}

function isTableLine(line) {
    return Boolean(tableCells(line));
}

function tableBounds(value, position) {
    const lines = value.split("\n");
    let offset = 0;
    let lineIndex = 0;

    for (; lineIndex < lines.length; lineIndex += 1) {
        const nextOffset = offset + lines[lineIndex].length + 1;
        if (position < nextOffset) break;
        offset = nextOffset;
    }

    if (!isTableLine(lines[lineIndex] || "")) return null;

    let startLine = lineIndex;
    while (startLine > 0 && isTableLine(lines[startLine - 1])) {
        startLine -= 1;
    }

    let endLine = lineIndex;
    while (endLine + 1 < lines.length && isTableLine(lines[endLine + 1])) {
        endLine += 1;
    }

    const startOffset = lines.slice(0, startLine).join("\n").length + (startLine === 0 ? 0 : 1);
    const endOffset = lines.slice(0, endLine + 1).join("\n").length;

    return {
        lines,
        startLine,
        endLine,
        startOffset,
        endOffset
    };
}

function tableLine(cells) {
    return `| ${cells.join(" | ")} |`;
}

function normalizedTableRows(bounds) {
    const tableLines = bounds.lines.slice(bounds.startLine, bounds.endLine + 1);
    const parsedRows = tableLines.map(line => tableCells(line) || []);
    const columnCount = Math.max(1, ...parsedRows.map(cells => cells.length));
    return parsedRows.map(cells => Array.from({length: columnCount}, (_, index) => cells[index] || ""));
}

function tableReplacementFromRows(rows) {
    return rows.map((cells, index) => {
        if (index === 1) return tableLine(cells.map(() => "---"));
        return tableLine(cells);
    }).join("\n");
}

function replaceMarkdownTable(value, bounds, rows, selectionStart, selectionEnd = selectionStart) {
    return replaceRange(
        value,
        bounds.startOffset,
        bounds.endOffset,
        tableReplacementFromRows(rows),
        selectionStart,
        selectionEnd
    );
}

export function isInsideMarkdownTable({value, start}) {
    return Boolean(tableBounds(value, start));
}

export function parseMarkdownTableBlock({value, start}) {
    const bounds = tableBounds(value, start);
    if (!bounds) return null;

    const rows = normalizedTableRows(bounds);
    const columnCount = rows[0]?.length || 0;
    return {
        start: bounds.startOffset,
        end: bounds.endOffset,
        header: rows[0] || [],
        rows: rows.slice(2),
        columnCount
    };
}

export function updateMarkdownTableCell({value, start, rowIndex, columnIndex, text}) {
    const bounds = tableBounds(value, start);
    if (!bounds) return null;

    const rows = normalizedTableRows(bounds);
    const sourceRowIndex = rowIndex < 0 ? 0 : rowIndex + 2;
    if (!rows[sourceRowIndex] || columnIndex < 0 || columnIndex >= rows[sourceRowIndex].length) return null;

    rows[sourceRowIndex][columnIndex] = text;
    return replaceMarkdownTable(value, bounds, rows, start, start);
}

export function moveMarkdownTableColumn({value, start, fromIndex, toIndex}) {
    const bounds = tableBounds(value, start);
    if (!bounds) return null;

    const rows = normalizedTableRows(bounds);
    const columnCount = rows[0]?.length || 0;
    if (fromIndex < 0 || fromIndex >= columnCount || toIndex < 0 || toIndex >= columnCount || fromIndex === toIndex) {
        return replaceRange(value, start, start, "", start, start);
    }

    const movedRows = rows.map(cells => {
        const next = [...cells];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
    });
    return replaceMarkdownTable(value, bounds, movedRows, start, start);
}

export function moveMarkdownTableRow({value, start, fromIndex, toIndex}) {
    const bounds = tableBounds(value, start);
    if (!bounds) return null;

    const rows = normalizedTableRows(bounds);
    const bodyRows = rows.slice(2);
    if (fromIndex < 0 || fromIndex >= bodyRows.length || toIndex < 0 || toIndex >= bodyRows.length || fromIndex === toIndex) {
        return replaceRange(value, start, start, "", start, start);
    }

    const [moved] = bodyRows.splice(fromIndex, 1);
    bodyRows.splice(toIndex, 0, moved);
    return replaceMarkdownTable(value, bounds, [rows[0], rows[1], ...bodyRows], start, start);
}

export function addColumnToMarkdownTable(state) {
    const bounds = tableBounds(state.value, state.start);
    if (!bounds) return null;

    const changedLines = bounds.lines.slice(bounds.startLine, bounds.endLine + 1)
        .map((line, index) => {
            const cells = tableCells(line);
            const nextCell = index === 0 ? "새 열" : index === 1 ? "---" : "";
            return tableLine([...cells, nextCell]);
        });
    const replacement = changedLines.join("\n");
    return replaceRange(
        state.value,
        bounds.startOffset,
        bounds.endOffset,
        replacement,
        state.start,
        state.end
    );
}

export function addRowToMarkdownTable(state) {
    const bounds = tableBounds(state.value, state.start);
    if (!bounds) return null;

    const firstRow = tableCells(bounds.lines[bounds.startLine]);
    const emptyRow = tableLine(firstRow.map(() => ""));
    const insertAfter = bounds.endOffset;
    return replaceRange(
        state.value,
        insertAfter,
        insertAfter,
        `\n${emptyRow}`,
        state.start,
        state.end
    );
}
