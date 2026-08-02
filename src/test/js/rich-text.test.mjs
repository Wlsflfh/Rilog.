import test from "node:test";
import assert from "node:assert/strict";
import {
    addAnnotationToFirstTextMatch,
    extractRichTextAnnotationIds,
    extractRichTextPlainText,
    renderRichTextDocument
} from "../../main/resources/static/js/rich-text.js";

class FakeNode {
    constructor(tagName, textContent = "") {
        this.tagName = tagName;
        this.textContent = textContent;
        this.children = [];
        this.dataset = {};
        this.attributes = {};
    }

    append(...children) {
        this.children.push(...children);
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }
}

globalThis.document = {
    createElement: tagName => new FakeNode(tagName),
    createTextNode: text => new FakeNode("#text", text)
};

function serialize(node) {
    if (node.tagName === "#text") return node.textContent;
    const dataset = Object.entries(node.dataset || {})
            .map(([name, value]) => `data-${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}="${value}"`);
    const attributes = [
        node.className ? `class="${node.className}"` : "",
        node.href ? `href="${node.href}"` : "",
        ...dataset,
        ...Object.entries(node.attributes || {}).map(([name, value]) => `${name}="${value}"`)
    ].filter(Boolean).join(" ");
    return `<${node.tagName}${attributes ? ` ${attributes}` : ""}>${node.textContent || ""}${node.children.map(serialize).join("")}</${node.tagName}>`;
}

test("renderRichTextDocument renders annotation marks as data spans", () => {
    const rendered = renderRichTextDocument({
        type: "doc",
        content: [{
            type: "paragraph",
            content: [{
                type: "text",
                text: "댓글 문장",
                marks: [{type: "annotation", attrs: {id: "12"}}]
            }]
        }]
    });

    assert.match(serialize(rendered), /<span class="rich-text-annotation" data-annotation-id="12">댓글 문장<\/span>/);
});

test("extractRichTextAnnotationIds returns unique annotation ids", () => {
    const ids = extractRichTextAnnotationIds({
        type: "doc",
        content: [{
            type: "paragraph",
            content: [
                {type: "text", text: "A", marks: [{type: "annotation", attrs: {id: "1"}}]},
                {type: "text", text: "B", marks: [{type: "annotation", attrs: {id: "1"}}, {type: "annotation", attrs: {id: "2"}}]}
            ]
        }]
    });

    assert.deepEqual(ids, ["1", "2"]);
});

test("extractRichTextPlainText keeps post excerpts readable", () => {
    assert.equal(extractRichTextPlainText({
        type: "doc",
        content: [
            {type: "heading", attrs: {level: 2}, content: [{type: "text", text: "제목"}]},
            {type: "paragraph", content: [{type: "text", text: "본문"}]}
        ]
    }), "제목 본문");
});

test("addAnnotationToFirstTextMatch wraps the selected text with an annotation mark", () => {
    const updated = JSON.parse(addAnnotationToFirstTextMatch({
        type: "doc",
        content: [{
            type: "paragraph",
            content: [{type: "text", text: "앞 문장 댓글 문장 뒤"}]
        }]
    }, "댓글 문장", 31));

    assert.deepEqual(updated.content[0].content, [
        {type: "text", text: "앞 문장 "},
        {type: "text", text: "댓글 문장", marks: [{type: "annotation", attrs: {id: "31"}}]},
        {type: "text", text: " 뒤"}
    ]);
});

test("renderRichTextDocument renders unsafe link marks as plain text", () => {
    const rendered = renderRichTextDocument({
        type: "doc",
        content: [{
            type: "paragraph",
            content: [{
                type: "text",
                text: "위험한 링크",
                marks: [{type: "link", attrs: {href: "javascript:alert(1)"}}]
            }]
        }]
    });

    const html = serialize(rendered);
    assert.doesNotMatch(html, /<a/);
    assert.match(html, />위험한 링크</);
});
