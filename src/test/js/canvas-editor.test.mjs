import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {
    applyCanvasTextMarkdownEdit,
    createCanvasRenderLayout,
    createCanvasSectionSnapshot,
    createCanvasViewportForSection,
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

test("parseCanvasDocument preserves JSON Canvas coordinates and node fields", () => {
    const document = parseCanvasDocument(JSON.stringify({
        nodes: [
            {id: "note", type: "text", x: -120, y: 80, width: 420, height: 260, text: "# Obsidian"},
            {id: "file", type: "file", x: 360, y: 90, width: 500, height: 380, file: "assets/diagram.png"},
            {id: "link", type: "link", x: 980, y: 90, width: 360, height: 180, url: "https://example.com"},
            {id: "group", type: "group", x: -180, y: -120, width: 620, height: 520, label: "묶음"}
        ],
        edges: [
            {id: "edge-note-file", fromNode: "note", fromSide: "right", toNode: "file", toSide: "left"}
        ]
    }));

    assert.deepEqual(document.nodes.map(node => ({
        id: node.id,
        type: node.type,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
    })), [
        {id: "note", type: "text", x: -120, y: 80, width: 420, height: 260},
        {id: "file", type: "file", x: 360, y: 90, width: 500, height: 380},
        {id: "link", type: "link", x: 980, y: 90, width: 360, height: 180},
        {id: "group", type: "group", x: -180, y: -120, width: 620, height: 520}
    ]);
    assert.equal(document.nodes[0].content, "# Obsidian");
    assert.equal(document.nodes[1].file, "assets/diagram.png");
    assert.equal(document.nodes[2].url, "https://example.com");
    assert.equal(document.nodes[3].label, "묶음");
    assert.deepEqual(document.edges, [
        {id: "edge-note-file", from: "note", to: "file", fromSide: "right", toSide: "left"}
    ]);
});

test("createCanvasRenderLayout shifts negative imported coordinates into the visible detail board", () => {
    const document = parseCanvasDocument(JSON.stringify({
        nodes: [
            {id: "left", type: "text", x: -240, y: -140, width: 320, height: 180, text: "왼쪽 위"},
            {id: "right", type: "text", x: 260, y: 120, width: 300, height: 160, text: "오른쪽"}
        ],
        sections: [
            {id: "intro", title: "도입", centerX: -80, centerY: 20, zoom: 1.2}
        ],
        edges: [
            {id: "edge-left-right", fromNode: "left", toNode: "right"}
        ]
    }));

    const layout = createCanvasRenderLayout(document);

    assert.equal(layout.nodes[0].x, 220);
    assert.equal(layout.nodes[0].y, 160);
    assert.equal(layout.nodes[1].x, 720);
    assert.equal(layout.nodes[1].y, 420);
    assert.deepEqual(layout.board.bounds, {
        minX: 220,
        minY: 160,
        maxX: 1020,
        maxY: 580
    });
    assert.deepEqual(layout.edges, [
        {id: "edge-left-right", from: "left", to: "right", fromSide: "", toSide: ""}
    ]);
    assert.deepEqual(layout.sections, [
        {id: "intro", title: "도입", centerX: 380, centerY: 320, zoom: 1.2}
    ]);
});

test("canvas section snapshots store the current viewport center and zoom", () => {
    const section = createCanvasSectionSnapshot("아키텍처", {width: 1000, height: 700}, {
        x: -700,
        y: -260,
        zoom: 1.4
    }, {id: "section-1"});

    assert.deepEqual(section, {
        id: "section-1",
        title: "아키텍처",
        centerX: 857.1428571428572,
        centerY: 435.7142857142857,
        zoom: 1.4
    });
});

test("createCanvasViewportForSection targets the saved section center", () => {
    assert.deepEqual(createCanvasViewportForSection({width: 1200, height: 720}, {
        centerX: 800,
        centerY: 420,
        zoom: 1.25
    }), {
        x: -400,
        y: -165,
        zoom: 1.25
    });
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

test("renderCanvasDocument renders text nodes as markdown cards", () => {
    const fixture = fileURLToPath(new URL("./canvas-render-fixture.mjs", import.meta.url));
    const source = JSON.stringify({
        nodes: [
            {id: "note", type: "text", x: 10, y: 20, width: 320, height: 180, content: "# 제목\n**굵게**"}
        ]
    });
    const result = spawnSync(process.execPath, [fixture, source], {timeout: 300});
    const html = result.stdout.toString();

    assert.equal(result.status, 0, `${result.error || result.stderr}`);
    assert.match(html, /<h1 id="제목">제목<\/h1>/);
    assert.match(html, /<strong>굵게<\/strong>/);
});

test("applyCanvasTextMarkdownEdit reuses markdown shortcuts for canvas node text", () => {
    assert.deepEqual(applyCanvasTextMarkdownEdit({
        value: "중요",
        start: 0,
        end: 2,
        key: "b",
        metaKey: true
    }), {
        value: "**중요**",
        start: 2,
        end: 4
    });
});

test("serializeCanvasDocument preserves section navigation entries", () => {
    const serialized = serializeCanvasDocument({
        nodes: [],
        edges: [],
        sections: [
            {id: "intro", title: " 도입 ", centerX: "120", centerY: "80", zoom: "1.3"},
            {id: "blank", title: " ", centerX: 0, centerY: 0, zoom: 1}
        ]
    });

    assert.deepEqual(JSON.parse(serialized), {
        version: 1,
        nodes: [],
        edges: [],
        sections: [
            {id: "intro", title: "도입", centerX: 120, centerY: 80, zoom: 1.3}
        ]
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
