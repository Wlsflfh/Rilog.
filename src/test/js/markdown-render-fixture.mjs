import {renderMarkdown} from "../../main/resources/static/js/markdown.js";

class FakeNode {
    constructor(tagName, textContent = "") {
        this.tagName = tagName;
        this.textContent = textContent;
        this.children = [];
        this.dataset = {};
        this.style = {};
    }

    append(...children) {
        this.children.push(...children);
    }
}

globalThis.document = {
    createElement: tagName => new FakeNode(tagName),
    createTextNode: text => new FakeNode("#text", text)
};
globalThis.window = {
    location: {
        origin: "http://localhost"
    }
};

function serialize(node) {
    if (node.tagName === "#text") return node.textContent;
    const children = node.children.map(serialize).join("");
    const attributes = [
        node.className ? `class="${node.className}"` : "",
        node.src ? `src="${node.src}"` : "",
        node.alt ? `alt="${node.alt}"` : "",
        node.href ? `href="${node.href}"` : ""
    ].filter(Boolean).join(" ");
    return `<${node.tagName}${attributes ? ` ${attributes}` : ""}>${node.textContent || ""}${children}</${node.tagName}>`;
}

process.stdout.write(serialize(renderMarkdown(process.argv[2])));
