const INLINE_SHORTCUTS = new Map([
    ["b", ["**", "**", "텍스트"]],
    ["i", ["*", "*", "텍스트"]],
    ["u", ["<u>", "</u>", "텍스트"]],
    ["e", ["`", "`", "코드"]],
    ["x", ["~~", "~~", "텍스트"]]
]);
const INDENT = "    ";

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
    if (key === "k") {
        return wrapSelection(state, "[", "](https://)", "링크");
    }
    if (INLINE_SHORTCUTS.has(key)) {
        return wrapSelection(state, ...INLINE_SHORTCUTS.get(key));
    }
    return null;
}

export function applyMarkdownAutocomplete(state) {
    const bounds = lineBounds(state.value, state.start);
    const line = state.value.slice(bounds.start, state.start);
    const key = state.key || " ";

    if (key === "Enter" && /^```[\w#+.-]*$/.test(line)) {
        return replaceRange(state.value, bounds.start, state.start, `${line}\n\n\`\`\`\n`, bounds.start + line.length + 1);
    }
    if (key === "Enter" && line === "---") {
        return replaceRange(state.value, bounds.start, state.start, "---\n", bounds.start + 4);
    }
    if (key === "Enter") {
        const quote = /^(\s*>\s*)$/.exec(line);
        if (quote) {
            return replaceRange(state.value, bounds.start, state.start, "", bounds.start);
        }

        const emptyList = /^(\s*)([-*+]|\d+\.)\s*$/.exec(line);
        if (emptyList) {
            return replaceRange(state.value, bounds.start, state.start, emptyList[1], bounds.start + emptyList[1].length);
        }

        const quoteContent = /^(\s*>\s+).+/.exec(line);
        if (quoteContent) {
            const replacement = `\n${quoteContent[1]}`;
            return replaceRange(state.value, state.start, state.start, replacement, state.start + replacement.length);
        }

        const listContent = /^(\s*(?:[-*+]|\d+\.)\s+).+/.exec(line);
        if (listContent) {
            const marker = nextListNumber(listContent[1]);
            const replacement = `\n${marker}`;
            return replaceRange(state.value, state.start, state.start, replacement, state.start + replacement.length);
        }
    }
    if (key !== " ") return null;

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

export function indentSelection({value, start, end, outdent = false}) {
    const selectionStartLine = lineBounds(value, start).start;
    const selectionEndLine = lineBounds(value, end).end;
    const block = value.slice(selectionStartLine, selectionEndLine);
    const lines = block.split("\n");
    const changed = lines.map(line => {
        if (!outdent) return line ? `${INDENT}${line}` : line;
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

export function isInsideMarkdownTable({value, start}) {
    return Boolean(tableBounds(value, start));
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
