const BLOCK_TAGS = {
    paragraph: "p",
    blockquote: "blockquote",
    code_block: "pre"
};

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function parseDocument(source) {
    if (!source) return {type: "doc", content: []};
    if (typeof source === "string") {
        try {
            return JSON.parse(source);
        } catch {
            return {type: "doc", content: []};
        }
    }
    return source;
}

export function extractRichTextAnnotationIds(source) {
    const documentData = parseDocument(source);
    const ids = new Set();
    walk(documentData, node => {
        (node.marks || []).forEach(mark => {
            if (mark.type === "annotation" && mark.attrs?.id !== undefined && mark.attrs.id !== null) {
                ids.add(String(mark.attrs.id));
            }
        });
    });
    return Array.from(ids);
}

export function extractRichTextPlainText(source) {
    const chunks = [];
    walk(parseDocument(source), node => {
        if (node.type === "text" && node.text) {
            chunks.push(node.text);
        }
    });
    return chunks.join(" ").replace(/\s+/g, " ").trim();
}

export function renderRichTextDocument(source) {
    const documentData = parseDocument(source);
    const root = element("div", "markdown-body rich-text-body");
    (documentData.content || []).forEach(child => root.append(renderBlock(child)));
    if (!root.children.length) {
        root.append(element("p", "markdown-placeholder", "본문이 비어있어요."));
    }
    return root;
}

function renderBlock(node) {
    if (node.type === "heading") {
        const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
        const heading = element(`h${level}`);
        appendInlineContent(heading, node.content || []);
        return heading;
    }
    if (node.type === "bullet_list" || node.type === "ordered_list") {
        const list = element(node.type === "ordered_list" ? "ol" : "ul");
        (node.content || []).forEach(child => list.append(renderBlock(child)));
        return list;
    }
    if (node.type === "list_item") {
        const item = element("li");
        (node.content || []).forEach(child => item.append(renderBlock(child)));
        return item;
    }
    if (node.type === "code_block") {
        const pre = element("pre");
        pre.append(element("code", null, textContent(node)));
        return pre;
    }

    const block = element(BLOCK_TAGS[node.type] || "p");
    appendInlineContent(block, node.content || []);
    return block;
}

function appendInlineContent(parent, content) {
    content.forEach(child => {
        if (child.type === "text") {
            parent.append(renderText(child));
            return;
        }
        parent.append(renderBlock(child));
    });
}

function renderText(node) {
    let current = document.createTextNode(node.text || "");
    (node.marks || []).forEach(mark => {
        current = wrapMark(current, mark);
    });
    return current;
}

function wrapMark(child, mark) {
    if (mark.type === "annotation") {
        const span = element("span", "rich-text-annotation");
        span.dataset.annotationId = String(mark.attrs?.id || "");
        span.append(child);
        return span;
    }
    if (mark.type === "strong") {
        const strong = element("strong");
        strong.append(child);
        return strong;
    }
    if (mark.type === "em") {
        const em = element("em");
        em.append(child);
        return em;
    }
    if (mark.type === "code") {
        const code = element("code");
        code.append(child);
        return code;
    }
    if (mark.type === "link") {
        const link = element("a");
        link.href = mark.attrs?.href || "#";
        link.append(child);
        return link;
    }
    return child;
}

function textContent(node) {
    const chunks = [];
    walk(node, child => {
        if (child.type === "text" && child.text) {
            chunks.push(child.text);
        }
    });
    return chunks.join("");
}

function walk(node, visit) {
    if (!node || typeof node !== "object") {
        return;
    }
    visit(node);
    (node.content || []).forEach(child => walk(child, visit));
}
