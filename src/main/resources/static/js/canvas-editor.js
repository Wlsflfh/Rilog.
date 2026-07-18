const CANVAS_VERSION = 1;
const DEFAULT_TEXT_NODE = {
    width: 300,
    height: 160,
    content: "새 생각을 적어보세요."
};
const DEFAULT_IMAGE_NODE = {
    width: 360,
    height: 240,
    alt: "image"
};

function createNodeId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeNumber(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeNode(node, index) {
    const type = node?.type === "image" ? "image" : "text";
    const base = {
        id: typeof node?.id === "string" && node.id.trim() ? node.id : createNodeId(),
        type,
        x: normalizeNumber(node?.x, 120 + index * 28),
        y: normalizeNumber(node?.y, 100 + index * 28),
        width: normalizeNumber(node?.width, type === "image" ? DEFAULT_IMAGE_NODE.width : DEFAULT_TEXT_NODE.width),
        height: normalizeNumber(node?.height, type === "image" ? DEFAULT_IMAGE_NODE.height : DEFAULT_TEXT_NODE.height)
    };

    if (type === "image") {
        return {
            ...base,
            url: typeof node?.url === "string" ? node.url : "",
            alt: typeof node?.alt === "string" ? node.alt : DEFAULT_IMAGE_NODE.alt
        };
    }

    return {
        ...base,
        content: typeof node?.content === "string" ? node.content : DEFAULT_TEXT_NODE.content
    };
}

export function createEmptyCanvasDocument() {
    return {
        version: CANVAS_VERSION,
        nodes: []
    };
}

export function parseCanvasDocument(source = "") {
    if (!source || !source.trim()) {
        return createEmptyCanvasDocument();
    }

    try {
        const parsed = JSON.parse(source);
        return {
            version: CANVAS_VERSION,
            nodes: Array.isArray(parsed.nodes)
                    ? parsed.nodes.map(normalizeNode)
                    : []
        };
    } catch {
        return createEmptyCanvasDocument();
    }
}

export function serializeCanvasDocument(document) {
    const normalized = {
        version: CANVAS_VERSION,
        nodes: Array.isArray(document?.nodes)
                ? document.nodes.map(normalizeNode)
                : []
    };
    return JSON.stringify(normalized);
}

export function createCanvasTextNode(overrides = {}) {
    return normalizeNode({
        id: createNodeId(),
        type: "text",
        x: 120,
        y: 100,
        ...DEFAULT_TEXT_NODE,
        ...overrides
    }, 0);
}

export function createCanvasImageNode(url, overrides = {}) {
    return normalizeNode({
        id: createNodeId(),
        type: "image",
        x: 160,
        y: 120,
        ...DEFAULT_IMAGE_NODE,
        ...overrides,
        url
    }, 0);
}

function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function applyNodeFrame(element, node) {
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    element.style.width = `${node.width}px`;
    element.style.height = `${node.height}px`;
}

function createCanvasNodeView(node) {
    const view = createElement("article", `canvas-node canvas-node-${node.type}`);
    applyNodeFrame(view, node);

    if (node.type === "image") {
        const image = document.createElement("img");
        image.src = node.url;
        image.alt = node.alt || "image";
        view.append(image);
        return view;
    }

    const content = createElement("div", "canvas-node-text");
    content.textContent = node.content;
    view.append(content);
    return view;
}

export function renderCanvasDocument(source = "") {
    const documentData = typeof source === "string" ? parseCanvasDocument(source) : parseCanvasDocument(serializeCanvasDocument(source));
    const root = createElement("div", "canvas-document");
    if (!documentData.nodes.length) {
        root.append(createElement("p", "canvas-empty", "아직 캔버스에 기록이 없어요."));
        return root;
    }

    documentData.nodes.forEach(node => {
        root.append(createCanvasNodeView(node));
    });
    return root;
}

export function createCanvasEditor({initialValue = "", onChange, uploadImage}) {
    const documentData = parseCanvasDocument(initialValue);
    const editor = createElement("div", "canvas-editor");
    const toolbar = createElement("div", "canvas-toolbar");
    const stage = createElement("div", "canvas-stage");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.className = "canvas-image-input";
    fileInput.setAttribute("aria-label", "Canvas 이미지 선택");

    const emitChange = () => {
        onChange?.(serializeCanvasDocument(documentData));
    };

    const render = () => {
        stage.replaceChildren();
        documentData.nodes.forEach(node => {
            const nodeView = createEditableCanvasNode(node, emitChange);
            stage.append(nodeView);
        });
        emitChange();
    };

    const addText = createElement("button", "canvas-tool", "텍스트 추가");
    addText.type = "button";
    addText.addEventListener("click", () => {
        documentData.nodes.push(createCanvasTextNode({
            x: 120 + documentData.nodes.length * 24,
            y: 100 + documentData.nodes.length * 24
        }));
        render();
    });

    const addImage = createElement("button", "canvas-tool", "이미지 추가");
    addImage.type = "button";
    addImage.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        fileInput.value = "";
        if (!file || !uploadImage) return;
        const result = await uploadImage(file);
        documentData.nodes.push(createCanvasImageNode(result.url, {
            x: 140 + documentData.nodes.length * 24,
            y: 120 + documentData.nodes.length * 24
        }));
        render();
    });

    toolbar.append(addText, addImage, fileInput);
    editor.append(toolbar, stage);
    render();
    return editor;
}

function createEditableCanvasNode(node, onChange) {
    const view = createElement("article", `canvas-node canvas-node-${node.type} canvas-node-editable`);
    applyNodeFrame(view, node);

    const dragHandle = createElement("div", "canvas-node-drag", "이동");
    view.append(dragHandle);

    if (node.type === "image") {
        const image = document.createElement("img");
        image.src = node.url;
        image.alt = node.alt || "image";
        view.append(image);
    } else {
        const text = createElement("textarea", "canvas-node-input");
        text.value = node.content;
        text.setAttribute("aria-label", "Canvas 텍스트");
        text.addEventListener("input", () => {
            node.content = text.value;
            onChange();
        });
        view.append(text);
    }

    const resizeHandle = createElement("div", "canvas-node-resize");
    resizeHandle.setAttribute("aria-label", "크기 조절");
    view.append(resizeHandle);

    makeDraggable(view, dragHandle, node, onChange);
    makeResizable(view, resizeHandle, node, onChange);
    return view;
}

function makeDraggable(view, handle, node, onChange) {
    handle.addEventListener("pointerdown", event => {
        event.preventDefault();
        handle.setPointerCapture(event.pointerId);
        const startX = event.clientX;
        const startY = event.clientY;
        const originX = node.x;
        const originY = node.y;

        const move = moveEvent => {
            node.x = Math.max(0, originX + moveEvent.clientX - startX);
            node.y = Math.max(0, originY + moveEvent.clientY - startY);
            applyNodeFrame(view, node);
            onChange();
        };
        const stop = () => {
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", stop);
            handle.removeEventListener("pointercancel", stop);
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", stop);
        handle.addEventListener("pointercancel", stop);
    });
}

function makeResizable(view, handle, node, onChange) {
    handle.addEventListener("pointerdown", event => {
        event.preventDefault();
        handle.setPointerCapture(event.pointerId);
        const startX = event.clientX;
        const startY = event.clientY;
        const originWidth = node.width;
        const originHeight = node.height;

        const move = moveEvent => {
            node.width = Math.max(160, originWidth + moveEvent.clientX - startX);
            node.height = Math.max(120, originHeight + moveEvent.clientY - startY);
            applyNodeFrame(view, node);
            onChange();
        };
        const stop = () => {
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", stop);
            handle.removeEventListener("pointercancel", stop);
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", stop);
        handle.addEventListener("pointercancel", stop);
    });
}
