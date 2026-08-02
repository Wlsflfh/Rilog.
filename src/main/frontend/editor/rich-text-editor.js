import {baseKeymap} from "prosemirror-commands";
import {history, redo, undo} from "prosemirror-history";
import {keymap} from "prosemirror-keymap";
import {EditorState, TextSelection} from "prosemirror-state";
import {EditorView} from "prosemirror-view";
import {parseRichTextDoc, richTextSchema} from "./rich-text-schema.js";

export function createRichTextEditor({mount, initialContent, onChange = () => {}}) {
    const state = EditorState.create({
        schema: richTextSchema,
        doc: parseRichTextDoc(initialContent),
        plugins: [
            history(),
            keymap({"Mod-z": undo, "Mod-y": redo, "Shift-Mod-z": redo}),
            keymap(baseKeymap)
        ]
    });
    const view = new EditorView(mount, {
        state,
        dispatchTransaction(transaction) {
            const nextState = view.state.apply(transaction);
            view.updateState(nextState);
            onChange(JSON.stringify(nextState.doc.toJSON()));
        }
    });

    return {
        getContent() {
            return JSON.stringify(view.state.doc.toJSON());
        },
        getSelectedText() {
            const {from, to} = view.state.selection;
            return view.state.doc.textBetween(from, to, " ");
        },
        selectText(from, to) {
            const selection = TextSelection.create(view.state.doc, from, to);
            view.dispatch(view.state.tr.setSelection(selection));
        },
        addAnnotationMark(id) {
            const {from, to, empty} = view.state.selection;
            if (empty) return;
            const mark = richTextSchema.marks.annotation.create({id: String(id)});
            view.dispatch(view.state.tr.addMark(from, to, mark));
        },
        destroy() {
            view.destroy();
        }
    };
}
