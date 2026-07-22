import test from "node:test";
import assert from "node:assert/strict";
import {
    createCanvasImageNode,
    createCanvasTextNode,
    createEmptyCanvasDocument,
    parseCanvasDocument,
    serializeCanvasDocument
} from "../../main/resources/static/js/canvas-editor.js";

test("createEmptyCanvasDocument returns versioned empty canvas", () => {
    assert.deepEqual(createEmptyCanvasDocument(), {
        version: 1,
        nodes: [],
        edges: []
    });
});

test("parseCanvasDocument falls back to empty document for invalid JSON", () => {
    assert.deepEqual(parseCanvasDocument("{"), {
        version: 1,
        nodes: [],
        edges: []
    });
});

test("parseCanvasDocument normalizes text and image nodes", () => {
    const document = parseCanvasDocument(JSON.stringify({
        version: 1,
        nodes: [
            {id: "a", type: "text", x: 10, y: 20, width: 300, height: 160, content: "메모"},
            {id: "b", type: "image", x: 30, y: 40, width: 360, height: 240, url: "/uploads/a.png", alt: "그림"}
        ]
    }));

    assert.equal(document.nodes[0].type, "text");
    assert.equal(document.nodes[0].content, "메모");
    assert.equal(document.nodes[1].type, "image");
    assert.equal(document.nodes[1].url, "/uploads/a.png");
});

test("serializeCanvasDocument returns stable JSON shape", () => {
    const serialized = serializeCanvasDocument({
        nodes: [
            {id: "a", type: "text", x: "10", y: "20", width: "300", height: "160", content: "메모"}
        ]
    });

    assert.deepEqual(JSON.parse(serialized), {
        version: 1,
        nodes: [
            {id: "a", type: "text", x: 10, y: 20, width: 300, height: 160, content: "메모"}
        ],
        edges: []
    });
});

test("createCanvasTextNode creates editable text node", () => {
    const node = createCanvasTextNode({id: "text-1", content: "JPA"});

    assert.equal(node.id, "text-1");
    assert.equal(node.type, "text");
    assert.equal(node.content, "JPA");
});

test("createCanvasImageNode creates image node with url", () => {
    const node = createCanvasImageNode("/uploads/a.png", {id: "image-1"});

    assert.equal(node.id, "image-1");
    assert.equal(node.type, "image");
    assert.equal(node.url, "/uploads/a.png");
});
