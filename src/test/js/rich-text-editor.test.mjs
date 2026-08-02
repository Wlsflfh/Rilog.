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
