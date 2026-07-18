const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const SAFE_IMAGE_PROTOCOLS = new Set(["http:", "https:"]);
const COLOR_TOKEN = /^<span style="color:\s*(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})">([\s\S]*?)<\/span>$/;

export function normalizeHexColor(value) {
    const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value?.trim() || "");
    if (!match) return null;
    const hex = match[1].toLowerCase();
    return `#${hex.length === 3 ? [...hex].map(character => character.repeat(2)).join("") : hex}`;
}

function plainHeadingText(source) {
    return source
        .replace(/<span style="color:\s*#[0-9a-fA-F]{3,6}">([\s\S]*?)<\/span>/g, "$1")
        .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
        .replace(/[*_`~]/g, "")
        .trim();
}

function headingSlug(source) {
    return plainHeadingText(source)
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .trim()
        .replace(/[\s-]+/g, "-") || "section";
}

export function extractHeadings(source = "") {
    const headings = [];
    const slugCounts = new Map();
    let insideCodeFence = false;

    source.replaceAll("\r\n", "\n").split("\n").forEach(line => {
        if (line.startsWith("```")) {
            insideCodeFence = !insideCodeFence;
            return;
        }
        if (insideCodeFence) return;

        const match = /^(#{1,4})\s+(.+)$/.exec(line);
        if (!match) return;
        const text = plainHeadingText(match[2]);
        const baseId = headingSlug(text);
        const count = (slugCounts.get(baseId) || 0) + 1;
        slugCounts.set(baseId, count);
        headings.push({
            level: match[1].length,
            text,
            id: count === 1 ? baseId : `${baseId}-${count}`
        });
    });
    return headings;
}

function appendInlineMarkdown(parent, source) {
    const pattern = /(<span style="color:\s*#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?">[\s\S]*?<\/span>|<u>[\s\S]*?<\/u>|<br\s*\/?>|!\[[^\]]*]\([^)]+\)|~~[\s\S]+?~~|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
    let cursor = 0;

    for (const match of source.matchAll(pattern)) {
        appendTextWithBreaks(parent, source.slice(cursor, match.index));
        const token = match[0];

        const color = COLOR_TOKEN.exec(token);
        if (color) {
            const span = document.createElement("span");
            span.style.color = normalizeHexColor(color[1]);
            appendInlineMarkdown(span, color[2]);
            parent.append(span);
        } else if (token.startsWith("<u>")) {
            const underline = document.createElement("u");
            appendInlineMarkdown(underline, token.slice(3, -4));
            parent.append(underline);
        } else if (token.startsWith("<br")) {
            parent.append(document.createElement("br"));
        } else if (token.startsWith("![")) {
            const parts = /^!\[([^\]]*)]\(([^)]+)\)$/.exec(token);
            const image = document.createElement("img");
            image.alt = parts[1];
            try {
                const url = new URL(parts[2], window.location.origin);
                if (SAFE_IMAGE_PROTOCOLS.has(url.protocol)) {
                    image.src = url.href;
                }
            } catch {
                // 잘못된 이미지 주소는 일반 텍스트로 남긴다.
            }
            parent.append(image.src ? image : document.createTextNode(parts[1] || token));
        } else if (token.startsWith("~~")) {
            const deleted = document.createElement("del");
            appendInlineMarkdown(deleted, token.slice(2, -2));
            parent.append(deleted);
        } else if (token.startsWith("`")) {
            const code = document.createElement("code");
            code.textContent = token.slice(1, -1);
            parent.append(code);
        } else if (token.startsWith("**")) {
            const strong = document.createElement("strong");
            strong.textContent = token.slice(2, -2);
            parent.append(strong);
        } else if (token.startsWith("*")) {
            const emphasis = document.createElement("em");
            emphasis.textContent = token.slice(1, -1);
            parent.append(emphasis);
        } else {
            const parts = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
            const anchor = document.createElement("a");
            anchor.textContent = parts[1];
            try {
                const url = new URL(parts[2], window.location.origin);
                if (SAFE_LINK_PROTOCOLS.has(url.protocol)) {
                    anchor.href = url.href;
                    if (url.protocol !== "mailto:") {
                        anchor.target = "_blank";
                        anchor.rel = "noopener noreferrer";
                    }
                }
            } catch {
                // 잘못된 주소는 링크가 아닌 일반 텍스트로 남긴다.
            }
            parent.append(anchor.href ? anchor : document.createTextNode(anchor.textContent));
        }
        cursor = match.index + token.length;
    }
    appendTextWithBreaks(parent, source.slice(cursor));
}

function appendTextWithBreaks(parent, source) {
    const lines = source.split("\n");
    lines.forEach((line, index) => {
        if (index > 0) parent.append(document.createElement("br"));
        if (line) parent.append(document.createTextNode(line));
    });
}

function textBlock(tag, source) {
    const node = document.createElement(tag);
    appendInlineMarkdown(node, source);
    return node;
}

function parseMarkdownImage(source) {
    const match = /^!\[([^\]]*)]\(([^)]+)\)$/.exec(source.trim());
    if (!match) return null;
    return {
        alt: match[1],
        url: match[2]
    };
}

function createImage({alt, url}) {
    const image = document.createElement("img");
    image.alt = alt;
    image.loading = "lazy";
    try {
        const parsedUrl = new URL(url, window.location.origin);
        if (SAFE_IMAGE_PROTOCOLS.has(parsedUrl.protocol)) {
            image.src = parsedUrl.href;
        }
    } catch {
        // 잘못된 이미지 주소는 일반 텍스트로 남긴다.
    }
    return image.src ? image : document.createTextNode(alt || `![${alt}](${url})`);
}

function renderImageGroup(lines, index) {
    const images = [];

    while (index < lines.length) {
        const image = parseMarkdownImage(lines[index]);
        if (!image) break;
        images.push(image);
        index += 1;
    }

    if (images.length === 1) {
        return {
            node: createImage(images[0]),
            nextIndex: index
        };
    }

    const grid = document.createElement("div");
    grid.className = `image-grid image-grid-${Math.min(images.length, 4)}`;
    images.forEach(image => grid.append(createImage(image)));
    return {
        node: grid,
        nextIndex: index
    };
}

function tableCells(line) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
    return trimmed
        .slice(1, -1)
        .split("|")
        .map(cell => cell.trim());
}

function isTableSeparator(line) {
    const cells = tableCells(line);
    return Boolean(cells?.length) && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function createTableRow(tag, cells) {
    const row = document.createElement("tr");
    cells.forEach(cell => row.append(textBlock(tag, cell)));
    return row;
}

function startsTable(lines, index) {
    const header = tableCells(lines[index]);
    const separator = tableCells(lines[index + 1] || "");
    return Boolean(
        header?.length
        && separator?.length === header.length
        && isTableSeparator(lines[index + 1])
    );
}

function renderTable(lines, index) {
    const headers = tableCells(lines[index]);
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    thead.append(createTableRow("th", headers));
    index += 2;

    while (index < lines.length) {
        const cells = tableCells(lines[index]);
        if (!cells || cells.length !== headers.length) break;
        tbody.append(createTableRow("td", cells));
        index += 1;
    }

    table.append(thead, tbody);
    return {table, nextIndex: index};
}

export function renderMarkdown(source = "") {
    const container = document.createElement("div");
    container.className = "markdown-body";
    const lines = source.replaceAll("\r\n", "\n").split("\n");
    const headings = extractHeadings(source);
    let headingIndex = 0;
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
            index += 1;
            continue;
        }

        if (line.startsWith("```")) {
            const language = line.slice(3).trim();
            const codeLines = [];
            index += 1;
            while (index < lines.length && !lines[index].startsWith("```")) {
                codeLines.push(lines[index]);
                index += 1;
            }
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            if (language) code.dataset.language = language;
            code.textContent = codeLines.join("\n");
            pre.append(code);
            container.append(pre);
            index += 1;
            continue;
        }

        const heading = /^(#{1,6})\s+(.+)$/.exec(line);
        if (heading) {
            const node = textBlock(`h${heading[1].length}`, heading[2]);
            if (heading[1].length <= 4) {
                node.id = headings[headingIndex].id;
                headingIndex += 1;
            }
            container.append(node);
            index += 1;
            continue;
        }

        if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
            container.append(document.createElement("hr"));
            index += 1;
            continue;
        }

        if (parseMarkdownImage(line)) {
            const {node, nextIndex} = renderImageGroup(lines, index);
            container.append(node);
            index = nextIndex;
            continue;
        }

        if (startsTable(lines, index)) {
            const {table, nextIndex} = renderTable(lines, index);
            container.append(table);
            index = nextIndex;
            continue;
        }

        if (line.startsWith("> ")) {
            const quote = document.createElement("blockquote");
            while (index < lines.length && lines[index].startsWith("> ")) {
                quote.append(textBlock("p", lines[index].slice(2)));
                index += 1;
            }
            container.append(quote);
            continue;
        }

        const listItem = /^\s*(?:([-*+])|(\d+)\.)\s+(.+)$/.exec(line);
        if (listItem) {
            const ordered = Boolean(listItem[2]);
            const list = document.createElement(ordered ? "ol" : "ul");
            while (index < lines.length) {
                const item = /^\s*(?:([-*+])|(\d+)\.)\s+(.+)$/.exec(lines[index]);
                if (!item || Boolean(item[2]) !== ordered) break;
                list.append(textBlock("li", item[3]));
                index += 1;
            }
            container.append(list);
            continue;
        }

        const paragraph = [];
        while (index < lines.length && lines[index].trim()) {
            const startsNewBlock = /^(#{1,6})\s+|^```|^>\s|^\s*(?:[-*+]\s+|\d+\.\s+)/.test(lines[index])
                    || startsTable(lines, index);
            if (paragraph.length && startsNewBlock) break;
            paragraph.push(lines[index]);
            index += 1;
        }
        container.append(textBlock("p", paragraph.join("\n")));
    }

    return container;
}
