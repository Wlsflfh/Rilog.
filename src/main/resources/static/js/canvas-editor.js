const CANVAS_VERSION = 1;
const DEFAULT_TEXT_NODE = {
    width: 300,
    height: 160,
    content: ""
};
const DEFAULT_IMAGE_NODE = {
    width: 360,
    height: 240,
    alt: "image",
    aspectRatio: 1.5
};
const CANVAS_BOARD = {
    width: 12000,
    height: 9000
};
const ZOOM = {
    min: 0.25,
    max: 2.5,
    step: 0.0024
};
const CANVAS_PAN_SPEED = 0.72;
const TEXT_PLACEHOLDER = "생각을 적어보세요.";
const CONNECTION_SIDES = ["top", "right", "bottom", "left"];

function createNodeId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEdgeId() {
    return `edge-${createNodeId()}`;
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
        const aspectRatio = normalizeNumber(node?.aspectRatio, base.width / base.height);
        return {
            ...base,
            url: typeof node?.url === "string" ? node.url : "",
            alt: typeof node?.alt === "string" ? node.alt : DEFAULT_IMAGE_NODE.alt,
            aspectRatio: aspectRatio > 0 ? aspectRatio : DEFAULT_IMAGE_NODE.aspectRatio
        };
    }

    return {
        ...base,
        content: typeof node?.content === "string" && node.content !== TEXT_PLACEHOLDER
                ? node.content
                : DEFAULT_TEXT_NODE.content
    };
}

function normalizeEdge(edge) {
    return {
        id: typeof edge?.id === "string" && edge.id.trim() ? edge.id : createEdgeId(),
        from: typeof edge?.from === "string" ? edge.from : "",
        to: typeof edge?.to === "string" ? edge.to : "",
        fromSide: CONNECTION_SIDES.includes(edge?.fromSide) ? edge.fromSide : "",
        toSide: CONNECTION_SIDES.includes(edge?.toSide) ? edge.toSide : ""
    };
}

function normalizeEdges(edges, nodes) {
    const nodeIds = new Set(nodes.map(node => node.id));
    return Array.isArray(edges)
            ? edges.map(normalizeEdge)
                    .filter(edge => edge.from && edge.to && edge.from !== edge.to)
                    .filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to))
            : [];
}

export function createEmptyCanvasDocument() {
    return {
        version: CANVAS_VERSION,
        nodes: [],
        edges: []
    };
}

export function parseCanvasDocument(source = "") {
    if (!source || !source.trim()) {
        return createEmptyCanvasDocument();
    }

    try {
        const parsed = JSON.parse(source);
        const nodes = Array.isArray(parsed.nodes)
                ? parsed.nodes.map(normalizeNode)
                : [];
        return {
            version: CANVAS_VERSION,
            nodes,
            edges: normalizeEdges(parsed.edges, nodes)
        };
    } catch {
        return createEmptyCanvasDocument();
    }
}

export function serializeCanvasDocument(document) {
    const nodes = Array.isArray(document?.nodes)
            ? document.nodes.map(normalizeNode)
            : [];
    const normalized = {
        version: CANVAS_VERSION,
        nodes,
        edges: normalizeEdges(document?.edges, nodes)
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

function createSvgElement(tag, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, String(value));
    });
    return element;
}

function applyNodeFrame(element, node) {
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    element.style.width = `${node.width}px`;
    element.style.height = `${node.height}px`;
}

function applyCanvasViewport(board, viewport) {
    board.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
}

function fitImageNodeToAspectRatio(node, aspectRatio) {
    if (node.type !== "image" || !Number.isFinite(aspectRatio) || aspectRatio <= 0) return false;
    const nextHeight = node.width / aspectRatio;
    const changed = Math.abs((node.aspectRatio || 0) - aspectRatio) > 0.001
            || Math.abs(node.height - nextHeight) > 0.5;
    node.aspectRatio = aspectRatio;
    node.height = nextHeight;
    return changed;
}

function readImageAspectRatio(url) {
    return new Promise(resolve => {
        const image = new Image();
        image.onload = () => {
            if (image.naturalWidth && image.naturalHeight) {
                resolve(image.naturalWidth / image.naturalHeight);
                return;
            }
            resolve(DEFAULT_IMAGE_NODE.aspectRatio);
        };
        image.onerror = () => resolve(DEFAULT_IMAGE_NODE.aspectRatio);
        image.src = url;
    });
}

function centerCanvasViewport(stage, viewport, nodes = []) {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const bounds = nodes.length
            ? calculateCanvasBounds(nodes)
            : {
                minX: CANVAS_BOARD.width / 2 - 1,
                minY: CANVAS_BOARD.height / 2 - 1,
                maxX: CANVAS_BOARD.width / 2 + 1,
                maxY: CANVAS_BOARD.height / 2 + 1
            };
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    viewport.x = rect.width / 2 - centerX * viewport.zoom;
    viewport.y = rect.height / 2 - centerY * viewport.zoom;
}

function calculateCanvasBounds(nodes = []) {
    if (!nodes.length) {
        return {
            minX: CANVAS_BOARD.width / 2 - 1,
            minY: CANVAS_BOARD.height / 2 - 1,
            maxX: CANVAS_BOARD.width / 2 + 1,
            maxY: CANVAS_BOARD.height / 2 + 1
        };
    }

    return nodes.reduce((acc, node) => {
        const left = normalizeNumber(node.x, 0);
        const top = normalizeNumber(node.y, 0);
        const right = left + normalizeNumber(node.width, DEFAULT_TEXT_NODE.width);
        const bottom = top + normalizeNumber(node.height, DEFAULT_TEXT_NODE.height);

        return {
            minX: Math.min(acc.minX, left),
            minY: Math.min(acc.minY, top),
            maxX: Math.max(acc.maxX, right),
            maxY: Math.max(acc.maxY, bottom)
        };
    }, {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY
    });
}

export function fitCanvasViewportToContent(stage, board, {
    padding = 56,
    minZoom = ZOOM.min,
    maxZoom = 1.5
} = {}) {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) {
        const fallback = {x: 0, y: 0, zoom: 1};
        applyCanvasViewport(board, fallback);
        return fallback;
    }

    const bounds = {
        minX: normalizeNumber(board.dataset.contentMinX, CANVAS_BOARD.width / 2 - 1),
        minY: normalizeNumber(board.dataset.contentMinY, CANVAS_BOARD.height / 2 - 1),
        maxX: normalizeNumber(board.dataset.contentMaxX, CANVAS_BOARD.width / 2 + 1),
        maxY: normalizeNumber(board.dataset.contentMaxY, CANVAS_BOARD.height / 2 + 1)
    };
    const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
    const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
    const availableWidth = Math.max(1, rect.width - padding * 2);
    const availableHeight = Math.max(1, rect.height - padding * 2);
    const zoom = Math.min(maxZoom, Math.max(minZoom, Math.min(
        availableWidth / contentWidth,
        availableHeight / contentHeight
    )));
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const viewport = {
        zoom,
        x: rect.width / 2 - centerX * zoom,
        y: rect.height / 2 - centerY * zoom
    };

    applyCanvasViewport(board, viewport);
    return viewport;
}

function screenToCanvasPoint(stage, viewport, clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    return {
        x: (clientX - rect.left - viewport.x) / viewport.zoom,
        y: (clientY - rect.top - viewport.y) / viewport.zoom
    };
}

function createCanvasNodeView(node) {
    const view = createElement("article", `canvas-node canvas-node-${node.type}`);
    applyNodeFrame(view, node);

    const shell = createElement("div", "canvas-node-shell");
    if (node.type === "image") {
        const image = document.createElement("img");
        image.src = node.url;
        image.alt = node.alt || "image";
        image.draggable = false;
        image.addEventListener("load", () => {
            if (fitImageNodeToAspectRatio(node, image.naturalWidth / image.naturalHeight)) {
                applyNodeFrame(view, node);
            }
        }, {once: true});
        shell.append(image);
        view.append(shell);
        return view;
    }

    const content = createElement("div", "canvas-node-text");
    content.textContent = node.content;
    shell.append(content);
    view.append(shell);
    return view;
}

function nodeCenter(node) {
    return {
        x: node.x + node.width / 2,
        y: node.y + node.height / 2
    };
}

function sidePoint(node, side) {
    const center = nodeCenter(node);
    switch (side) {
        case "top":
            return {x: center.x, y: node.y, side};
        case "right":
            return {x: node.x + node.width, y: center.y, side};
        case "bottom":
            return {x: center.x, y: node.y + node.height, side};
        case "left":
            return {x: node.x, y: center.y, side};
        default:
            return null;
    }
}

function nearestSide(node, point) {
    const candidates = CONNECTION_SIDES.map(side => sidePoint(node, side));
    return candidates.reduce((nearest, candidate) => {
        const candidateDistance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
        const nearestDistance = Math.hypot(nearest.x - point.x, nearest.y - point.y);
        return candidateDistance < nearestDistance ? candidate : nearest;
    }).side;
}

function connectionPoint(from, to, role) {
    const fromCenter = nodeCenter(from);
    const toCenter = nodeCenter(to);
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy);

    if (horizontal) {
        if ((role === "from" && dx >= 0) || (role === "to" && dx < 0)) {
            return {
                x: from.x + from.width,
                y: fromCenter.y,
                side: "right"
            };
        }

        return {
            x: from.x,
            y: fromCenter.y,
            side: "left"
        };
    }

    if ((role === "from" && dy >= 0) || (role === "to" && dy < 0)) {
        return {
            x: fromCenter.x,
            y: from.y + from.height,
            side: "bottom"
        };
    }

    return {
        x: fromCenter.x,
        y: from.y,
        side: "top"
    };
}

function controlOffset(point, distance) {
    switch (point.side) {
        case "left":
            return {x: -distance, y: 0};
        case "right":
            return {x: distance, y: 0};
        case "top":
            return {x: 0, y: -distance};
        case "bottom":
            return {x: 0, y: distance};
        default:
            return {x: distance, y: 0};
    }
}

function edgePathBetween(from, to, edge = {}) {
    const start = sidePoint(from, edge.fromSide) || connectionPoint(from, to, "from");
    const end = sidePoint(to, edge.toSide) || connectionPoint(to, from, "to");
    const distance = Math.max(90, Math.min(320, Math.hypot(end.x - start.x, end.y - start.y) * 0.34));
    const startControl = controlOffset(start, distance);
    const endControl = controlOffset(end, distance);

    return `M ${start.x} ${start.y} C ${start.x + startControl.x} ${start.y + startControl.y}, ${end.x + endControl.x} ${end.y + endControl.y}, ${end.x} ${end.y}`;
}

function previewEdgePath(sourceNode, end, sourceSide) {
    const ghostTarget = {
        x: end.x - 1,
        y: end.y - 1,
        width: 2,
        height: 2
    };
    const start = sidePoint(sourceNode, sourceSide) || sidePoint(sourceNode, "right");
    const distance = Math.max(90, Math.min(280, Math.hypot(end.x - start.x, end.y - start.y) * 0.34));
    const startControl = controlOffset(start, distance);
    const endPoint = connectionPoint(ghostTarget, sourceNode, "to");
    const endControl = controlOffset(endPoint, distance);

    return `M ${start.x} ${start.y} C ${start.x + startControl.x} ${start.y + startControl.y}, ${endPoint.x + endControl.x} ${endPoint.y + endControl.y}, ${endPoint.x} ${endPoint.y}`;
}

function createCanvasEdgesView(edges, nodes, options = {}) {
    const {selected, onSelectEdge} = options;
    const isEditable = typeof onSelectEdge === "function";
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const svg = createSvgElement("svg", {
        class: `canvas-edges${isEditable ? " canvas-edges-editable" : ""}`,
        viewBox: `0 0 ${CANVAS_BOARD.width} ${CANVAS_BOARD.height}`,
        preserveAspectRatio: "none"
    });
    if (!isEditable) {
        svg.setAttribute("aria-hidden", "true");
    }
    const defs = createSvgElement("defs");
    const marker = createSvgElement("marker", {
        id: "canvas-arrow",
        viewBox: "0 0 10 10",
        refX: "8",
        refY: "5",
        markerWidth: "7",
        markerHeight: "7",
        orient: "auto-start-reverse"
    });
    marker.append(createSvgElement("path", {
        d: "M 0 0 L 10 5 L 0 10 z",
        class: "canvas-arrow-head"
    }));
    const selectedMarker = createSvgElement("marker", {
        id: "canvas-arrow-selected",
        viewBox: "0 0 10 10",
        refX: "8",
        refY: "5",
        markerWidth: "7",
        markerHeight: "7",
        orient: "auto-start-reverse"
    });
    selectedMarker.append(createSvgElement("path", {
        d: "M 0 0 L 10 5 L 0 10 z",
        class: "canvas-arrow-head canvas-arrow-head-selected"
    }));
    defs.append(marker, selectedMarker);
    svg.append(defs);

    edges.forEach(edge => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return;

        const isSelected = selected?.type === "edge" && selected.id === edge.id;
        const pathData = edgePathBetween(from, to, edge);
        const selectCurrentEdge = event => {
            event.preventDefault();
            event.stopPropagation();
            onSelectEdge(edge.id);
        };
        if (isEditable) {
            const hitPath = createSvgElement("path", {
                class: "canvas-edge-hit",
                d: pathData
            });
            hitPath.dataset.edgeId = edge.id;
            hitPath.addEventListener("pointerdown", selectCurrentEdge);
            svg.append(hitPath);
        }
        const path = createSvgElement("path", {
            class: `canvas-edge${isSelected ? " is-selected" : ""}`,
            d: pathData,
            "marker-end": isSelected ? "url(#canvas-arrow-selected)" : "url(#canvas-arrow)"
        });
        path.dataset.edgeId = edge.id;
        if (isEditable) {
            path.setAttribute("role", "button");
            path.setAttribute("tabindex", "0");
            path.setAttribute("aria-label", "화살표 선택");
            path.addEventListener("pointerdown", selectCurrentEdge);
        }
        svg.append(path);
    });

    return svg;
}

function calculateCanvasBoard(nodes) {
    const bounds = calculateCanvasBounds(nodes);

    if (!nodes.length) {
        return {
            width: CANVAS_BOARD.width,
            height: CANVAS_BOARD.height,
            scrollLeft: 0,
            scrollTop: 0,
            bounds
        };
    }

    return {
        width: Math.max(CANVAS_BOARD.width, bounds.maxX + 420),
        height: Math.max(CANVAS_BOARD.height, bounds.maxY + 360),
        scrollLeft: Math.max(0, bounds.minX - 220),
        scrollTop: Math.max(0, bounds.minY - 160),
        bounds
    };
}

export function renderCanvasDocument(source = "") {
    const documentData = typeof source === "string" ? parseCanvasDocument(source) : parseCanvasDocument(serializeCanvasDocument(source));
    const root = createElement("div", "canvas-document canvas-board");
    const board = calculateCanvasBoard(documentData.nodes);
    root.style.minWidth = `${Math.max(board.width, CANVAS_BOARD.width)}px`;
    root.style.minHeight = `${Math.max(board.height, CANVAS_BOARD.height)}px`;
    root.dataset.initialScrollLeft = String(board.scrollLeft);
    root.dataset.initialScrollTop = String(board.scrollTop);
    root.dataset.contentMinX = String(board.bounds.minX);
    root.dataset.contentMinY = String(board.bounds.minY);
    root.dataset.contentMaxX = String(board.bounds.maxX);
    root.dataset.contentMaxY = String(board.bounds.maxY);

    if (!documentData.nodes.length) {
        root.append(createElement("p", "canvas-empty", "아직 캔버스에 기록이 없어요."));
        return root;
    }

    root.append(createCanvasEdgesView(documentData.edges, documentData.nodes));
    documentData.nodes.forEach(node => {
        root.append(createCanvasNodeView(node));
    });
    return root;
}

export function createCanvasEditor({initialValue = "", onChange, uploadImage}) {
    const documentData = parseCanvasDocument(initialValue);
    let selectedObject = null;
    const viewport = {
        x: 0,
        y: 0,
        zoom: 1.28
    };
    const editor = createElement("div", "canvas-editor");
    editor.tabIndex = -1;
    const toolbar = createElement("div", "canvas-toolbar");
    const stage = createElement("div", "canvas-stage canvas-stage-editable");
    const board = createElement("div", "canvas-board");
    board.style.width = `${CANVAS_BOARD.width}px`;
    board.style.height = `${CANVAS_BOARD.height}px`;
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.className = "canvas-image-input";
    fileInput.setAttribute("aria-label", "Canvas 이미지 선택");

    const emitChange = () => {
        onChange?.(serializeCanvasDocument(documentData));
    };

    const screenToCanvas = (clientX, clientY) => {
        return screenToCanvasPoint(stage, viewport, clientX, clientY);
    };

    const focusEditor = () => {
        editor.focus({preventScroll: true});
    };

    const blurFocusedCanvasInput = () => {
        const activeElement = document.activeElement;
        if (activeElement?.closest?.(".canvas-editor") && isTextEditingTarget(activeElement)) {
            activeElement.blur();
        }
    };

    const applySelection = () => {
        board.querySelectorAll(".canvas-node-editable").forEach(nodeView => {
            nodeView.classList.toggle(
                    "is-selected",
                    selectedObject?.type === "node" && selectedObject.id === nodeView.dataset.nodeId
            );
        });
        board.querySelectorAll(".canvas-edge").forEach(edgeView => {
            const isSelected = selectedObject?.type === "edge" && selectedObject.id === edgeView.dataset.edgeId;
            edgeView.classList.toggle("is-selected", isSelected);
            edgeView.setAttribute("marker-end", isSelected ? "url(#canvas-arrow-selected)" : "url(#canvas-arrow)");
        });
    };

    const selectNode = nodeId => {
        selectedObject = {
            type: "node",
            id: nodeId
        };
        applySelection();
        focusEditor();
    };

    const selectEdge = edgeId => {
        selectedObject = {
            type: "edge",
            id: edgeId
        };
        applySelection();
        focusEditor();
    };

    const deleteSelection = () => {
        if (!selectedObject) return;

        if (selectedObject.type === "node") {
            const nodeId = selectedObject.id;
            const nextNodes = documentData.nodes.filter(node => node.id !== nodeId);
            if (nextNodes.length === documentData.nodes.length) return;
            documentData.nodes.splice(0, documentData.nodes.length, ...nextNodes);
            documentData.edges = documentData.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId);
        }

        if (selectedObject.type === "edge") {
            const nextEdges = documentData.edges.filter(edge => edge.id !== selectedObject.id);
            if (nextEdges.length === documentData.edges.length) return;
            documentData.edges = nextEdges;
        }

        selectedObject = null;
        rerender();
    };

    const render = () => {
        board.replaceChildren(createCanvasEdgesView(documentData.edges, documentData.nodes, {
            selected: selectedObject,
            onSelectEdge: selectEdge
        }));
        documentData.nodes.forEach(node => {
            const nodeView = createEditableCanvasNode(node, {
                selected: selectedObject?.type === "node" && selectedObject.id === node.id,
                onSelect: selectNode,
                onChange: emitChange,
                onFrameChange: () => {
                    emitChange();
                    syncEdges();
                },
                getZoom: () => viewport.zoom,
                onConnectStart: startConnection
            });
            board.append(nodeView);
        });
        emitChange();
    };

    const syncEdges = () => {
        board.querySelector(".canvas-edges")?.replaceWith(createCanvasEdgesView(documentData.edges, documentData.nodes, {
            selected: selectedObject,
            onSelectEdge: selectEdge
        }));
        applySelection();
    };

    const rerender = () => {
        render();
        applyCanvasViewport(board, viewport);
    };

    const addNodeAtViewportCenter = nodeFactory => {
        const rect = stage.getBoundingClientRect();
        const center = screenToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2);
        const node = nodeFactory({
            x: Math.max(40, center.x - 150 + documentData.nodes.length * 16),
            y: Math.max(40, center.y - 80 + documentData.nodes.length * 16)
        });
        documentData.nodes.push(node);
        selectedObject = {
            type: "node",
            id: node.id
        };
        rerender();
    };

    const addText = createElement("button", "canvas-tool", "텍스트 추가");
    addText.type = "button";
    addText.addEventListener("click", () => {
        addNodeAtViewportCenter(createCanvasTextNode);
    });

    const addImage = createElement("button", "canvas-tool", "이미지 추가");
    addImage.type = "button";
    addImage.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        fileInput.value = "";
        if (!file || !uploadImage) return;
        const result = await uploadImage(file);
        const aspectRatio = await readImageAspectRatio(result.url);
        addNodeAtViewportCenter(overrides => createCanvasImageNode(result.url, {
            ...overrides,
            aspectRatio,
            height: DEFAULT_IMAGE_NODE.width / aspectRatio
        }));
    });

    function startConnection(sourceNode, event) {
        event.preventDefault();
        event.stopPropagation();
        const handle = event.currentTarget;
        const sourceSide = CONNECTION_SIDES.includes(handle.dataset.side) ? handle.dataset.side : "right";
        handle.setPointerCapture(event.pointerId);
        const preview = createSvgElement("svg", {
            class: "canvas-connection-preview",
            viewBox: `0 0 ${CANVAS_BOARD.width} ${CANVAS_BOARD.height}`,
            preserveAspectRatio: "none",
            "aria-hidden": "true"
        });
        const previewPath = createSvgElement("path", {
            class: "canvas-edge canvas-edge-preview"
        });
        preview.append(previewPath);
        board.append(preview);

        const draw = moveEvent => {
            const end = screenToCanvas(moveEvent.clientX, moveEvent.clientY);
            previewPath.setAttribute("d", previewEdgePath(sourceNode, end, sourceSide));
        };

        const stop = upEvent => {
            handle.removeEventListener("pointermove", draw);
            handle.removeEventListener("pointerup", stop);
            handle.removeEventListener("pointercancel", stop);
            preview.remove();

            const targetView = document
                    .elementFromPoint(upEvent.clientX, upEvent.clientY)
                    ?.closest?.(".canvas-node-editable");
            const targetId = targetView?.dataset.nodeId;
            if (targetId && targetId !== sourceNode.id) {
                const targetNode = documentData.nodes.find(node => node.id === targetId);
                const targetPoint = screenToCanvas(upEvent.clientX, upEvent.clientY);
                const targetSide = targetNode ? nearestSide(targetNode, targetPoint) : "";
                const alreadyConnected = documentData.edges.some(edge =>
                    edge.from === sourceNode.id
                    && edge.to === targetId
                    && edge.fromSide === sourceSide
                    && edge.toSide === targetSide
                );
                if (!alreadyConnected) {
                    const edge = {
                        id: createEdgeId(),
                        from: sourceNode.id,
                        to: targetId,
                        fromSide: sourceSide,
                        toSide: targetSide
                    };
                    documentData.edges.push(edge);
                    selectedObject = {
                        type: "edge",
                        id: edge.id
                    };
                    rerender();
                }
            }
        };

        handle.addEventListener("pointermove", draw);
        handle.addEventListener("pointerup", stop);
        handle.addEventListener("pointercancel", stop);
        draw(event);
    }

    enableCanvasPanZoom(stage, board, viewport);
    stage.addEventListener("pointerdown", event => {
        if (event.target.closest(".canvas-node")
                || event.target.closest(".canvas-edge")
                || event.target.closest(".canvas-toolbar")) {
            return;
        }
        selectedObject = null;
        blurFocusedCanvasInput();
        applySelection();
    }, {capture: true});
    editor.addEventListener("keydown", event => {
        if (event.key !== "Backspace" && event.key !== "Delete") return;
        if (isTextEditingTarget(event.target)) return;
        event.preventDefault();
        deleteSelection();
    });
    toolbar.append(addText, addImage, fileInput);
    stage.append(board);
    editor.append(toolbar, stage);
    rerender();
    requestAnimationFrame(() => {
        centerCanvasViewport(stage, viewport, documentData.nodes);
        applyCanvasViewport(board, viewport);
    });
    return editor;
}

function createEditableCanvasNode(node, {selected = false, onSelect, onChange, onFrameChange = onChange, getZoom, onConnectStart}) {
    const view = createElement("article", `canvas-node canvas-node-${node.type} canvas-node-editable${selected ? " is-selected" : ""}`);
    view.dataset.nodeId = node.id;
    applyNodeFrame(view, node);

    const shell = createElement("div", "canvas-node-shell");
    if (node.type === "image") {
        const image = document.createElement("img");
        image.src = node.url;
        image.alt = node.alt || "image";
        image.draggable = false;
        image.addEventListener("load", () => {
            if (fitImageNodeToAspectRatio(node, image.naturalWidth / image.naturalHeight)) {
                applyNodeFrame(view, node);
                onFrameChange();
            }
        }, {once: true});
        shell.append(image);
    } else {
        const text = createElement("textarea", "canvas-node-input");
        text.value = node.content;
        text.placeholder = TEXT_PLACEHOLDER;
        text.setAttribute("aria-label", "Canvas 텍스트");
        text.addEventListener("input", () => {
            node.content = text.value;
            onChange();
        });
        text.addEventListener("pointerdown", event => {
            event.stopPropagation();
        });
        shell.append(text);
    }
    view.append(shell);

    const resizeHandle = createElement("div", "canvas-node-resize");
    resizeHandle.setAttribute("aria-label", "크기 조절");
    view.append(resizeHandle);

    CONNECTION_SIDES.forEach(side => {
        const connectHandle = createElement("button", `canvas-node-connect canvas-node-connect-${side}`, "");
        connectHandle.type = "button";
        connectHandle.dataset.side = side;
        connectHandle.setAttribute("aria-label", `${side} 연결점`);
        connectHandle.title = "다른 박스로 드래그해서 화살표 연결";
        connectHandle.addEventListener("pointerdown", event => onConnectStart(node, event));
        view.append(connectHandle);
    });

    makeDraggable(view, view, node, onFrameChange, getZoom, () => onSelect?.(node.id));
    makeResizable(view, resizeHandle, node, onFrameChange, getZoom);
    return view;
}

export function enableCanvasPanZoom(stage, board, viewport = {x: 0, y: 0, zoom: 1}) {
    applyCanvasViewport(board, viewport);

    stage.addEventListener("pointerdown", event => {
        if (event.target.closest(".canvas-node") || event.target.closest(".canvas-toolbar")) return;
        event.preventDefault();
        stage.classList.add("is-panning");
        stage.setPointerCapture(event.pointerId);
        const startX = event.clientX;
        const startY = event.clientY;
        const originX = viewport.x;
        const originY = viewport.y;

        const move = moveEvent => {
            viewport.x = originX + moveEvent.clientX - startX;
            viewport.y = originY + moveEvent.clientY - startY;
            applyCanvasViewport(board, viewport);
        };

        const stop = () => {
            stage.classList.remove("is-panning");
            stage.removeEventListener("pointermove", move);
            stage.removeEventListener("pointerup", stop);
            stage.removeEventListener("pointercancel", stop);
        };

        stage.addEventListener("pointermove", move);
        stage.addEventListener("pointerup", stop);
        stage.addEventListener("pointercancel", stop);
    });

    stage.addEventListener("wheel", event => {
        event.preventDefault();

        if (!event.ctrlKey) {
            viewport.x -= event.deltaX * CANVAS_PAN_SPEED;
            viewport.y -= event.deltaY * CANVAS_PAN_SPEED;
            applyCanvasViewport(board, viewport);
            return;
        }

        const rect = stage.getBoundingClientRect();
        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;
        const before = screenToCanvasPoint(stage, viewport, event.clientX, event.clientY);

        const nextZoom = Math.min(ZOOM.max, Math.max(ZOOM.min, viewport.zoom * (1 - event.deltaY * ZOOM.step)));
        viewport.zoom = nextZoom;
        viewport.x = pointerX - before.x * nextZoom;
        viewport.y = pointerY - before.y * nextZoom;
        applyCanvasViewport(board, viewport);
    }, {passive: false});
}

function makeDraggable(view, handle, node, onChange, getZoom, onSelect) {
    handle.addEventListener("pointerdown", event => {
        if (event.target.closest(".canvas-node-resize")
                || event.target.closest(".canvas-node-connect")
                || event.target.closest(".canvas-node-input")) {
            return;
        }
        onSelect?.();
        event.stopPropagation();
        handle.setPointerCapture(event.pointerId);
        const startX = event.clientX;
        const startY = event.clientY;
        const originX = node.x;
        const originY = node.y;
        let dragging = false;

        const move = moveEvent => {
            const distanceX = moveEvent.clientX - startX;
            const distanceY = moveEvent.clientY - startY;
            if (!dragging && Math.hypot(distanceX, distanceY) < 4) {
                return;
            }
            if (!dragging) {
                dragging = true;
                view.classList.add("is-dragging");
                view.querySelector(".canvas-node-input")?.blur();
            }
            moveEvent.preventDefault();
            const zoom = getZoom();
            node.x = Math.max(0, originX + distanceX / zoom);
            node.y = Math.max(0, originY + distanceY / zoom);
            applyNodeFrame(view, node);
            onChange();
        };
        const stop = () => {
            view.classList.remove("is-dragging");
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", stop);
            handle.removeEventListener("pointercancel", stop);
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", stop);
        handle.addEventListener("pointercancel", stop);
    });
}

function isTextEditingTarget(target) {
    return target instanceof HTMLTextAreaElement
            || target instanceof HTMLInputElement
            || target?.isContentEditable;
}

function makeResizable(view, handle, node, onChange, getZoom) {
    handle.addEventListener("pointerdown", event => {
        event.preventDefault();
        event.stopPropagation();
        handle.setPointerCapture(event.pointerId);
        const startX = event.clientX;
        const startY = event.clientY;
        const originWidth = node.width;
        const originHeight = node.height;

        const move = moveEvent => {
            const zoom = getZoom();
            if (node.type === "image") {
                const targetWidth = Math.max(120, originWidth + (moveEvent.clientX - startX) / zoom);
                const targetHeight = Math.max(80, originHeight + (moveEvent.clientY - startY) / zoom);
                const scale = Math.max(targetWidth / originWidth, targetHeight / originHeight);
                node.width = Math.max(120, originWidth * scale);
                node.height = node.width / (node.aspectRatio || originWidth / originHeight || DEFAULT_IMAGE_NODE.aspectRatio);
            } else {
                node.width = Math.max(160, originWidth + (moveEvent.clientX - startX) / zoom);
                node.height = Math.max(120, originHeight + (moveEvent.clientY - startY) / zoom);
            }
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
