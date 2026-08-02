import {Schema} from "prosemirror-model";
import {schema as basicSchema} from "prosemirror-schema-basic";

const annotation = {
    attrs: {id: {}},
    inclusive: true,
    parseDOM: [{
        tag: "span[data-annotation-id]",
        getAttrs: dom => ({id: dom.getAttribute("data-annotation-id")})
    }],
    toDOM: mark => ["span", {
        "data-annotation-id": mark.attrs.id,
        class: "rich-text-annotation"
    }, 0]
};

export const richTextSchema = new Schema({
    nodes: basicSchema.spec.nodes,
    marks: basicSchema.spec.marks.addToEnd("annotation", annotation)
});

export function parseRichTextDoc(source) {
    try {
        const json = typeof source === "string" ? JSON.parse(source) : source;
        return richTextSchema.nodeFromJSON(json);
    } catch {
        return richTextSchema.topNodeType.createAndFill();
    }
}
