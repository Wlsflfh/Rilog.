import test from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true
});

const {createRichTextEditor} = await import("../../main/frontend/editor/rich-text-editor.js");

test("createRichTextEditor serializes ProseMirror doc JSON", () => {
    const mount = document.createElement("div");
    const editor = createRichTextEditor({
        mount,
        initialContent: "{\"type\":\"doc\",\"content\":[]}",
        onChange: () => {}
    });

    const content = JSON.parse(editor.getContent());
    assert.equal(content.type, "doc");
    editor.destroy();
});

test("addAnnotationMark stores annotation mark in serialized document", () => {
    const mount = document.createElement("div");
    const editor = createRichTextEditor({
        mount,
        initialContent: JSON.stringify({
            type: "doc",
            content: [{type: "paragraph", content: [{type: "text", text: "댓글 문장"}]}]
        }),
        onChange: () => {}
    });

    editor.selectText(1, 5);
    editor.addAnnotationMark(7);

    const content = JSON.stringify(JSON.parse(editor.getContent()));
    assert.match(content, /"annotation"/);
    assert.match(content, /"7"/);
    editor.destroy();
});
