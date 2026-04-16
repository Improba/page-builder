<script setup lang="ts">
  import {
    computed,
    getCurrentInstance,
    h,
    inject,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    render,
    watch,
    type CSSProperties,
    type PropType,
  } from 'vue';
  import { getComponent } from '@/core/registry';
  import {
    createIframeBridgeChild,
    createIframeBridgeParent,
    createIframeBridgeSessionToken,
    mountIframeBridgeDomListeners,
    type IframeBridgeKeydownPayload,
    type IframeBridgePointerPayload,
  } from '@/core/iframe-bridge';
  import { normalizeDropSlot } from '@/core/drop-slot';
  import { findNodeById, findParent } from '@/core/tree';
  import { DRAG_DROP_KEY, NODE_TREE_KEY } from '@/types/keys';
  import type { INode } from '@/types/node';
  import type { IViewportSize, ViewportPreset } from '@/types/editor';
  import { VIEWPORT_PRESETS } from '@/types/editor';
  import { usePageBuilderI18n } from '@/i18n';
  import NodeRenderer from '../reader/NodeRenderer.vue';
  import NodeContextMenu, { type NodeContextMenuAction } from './NodeContextMenu.vue';

  const props = defineProps({
    tree: { type: Object as PropType<INode>, required: true },
    variables: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
    selectedNodeId: { type: Number as PropType<number | null>, default: null },
    hoveredNodeId: { type: Number as PropType<number | null>, default: null },
    viewport: { type: String as PropType<ViewportPreset>, default: 'desktop' },
    viewportWidth: { type: Number as PropType<number | null>, default: null },
    viewportHeight: { type: Number as PropType<number | null>, default: null },
  });

  interface IframeCanvasKeydownPayload extends IframeBridgeKeydownPayload {
    preventDefault: () => void;
  }

  const emit = defineEmits<{
    select: [nodeId: number | null];
    hover: [nodeId: number | null];
    'context-action': [payload: { action: NodeContextMenuAction; nodeId: number }];
    'iframe-keydown': [payload: IframeCanvasKeydownPayload];
    'viewport-size-change': [payload: IViewportSize];
  }>();

  interface OverlayRect {
    top: number;
    left: number;
    width: number;
    height: number;
  }

  interface DropLocation {
    targetId: number;
    index: number;
    slot: string;
  }

  const IFRAME_CONTENT_ROOT_ID = 'ipb-iframe-canvas-content';
  const IFRAME_BASE_STYLE_ID = 'ipb-iframe-canvas-base-style';
  const MIN_VIEWPORT_WIDTH = 240;
  const MIN_VIEWPORT_HEIGHT = 320;

  const nodeTree = inject(NODE_TREE_KEY, null);
  const dragDrop = inject(DRAG_DROP_KEY, null);
  const { t } = usePageBuilderI18n();
  const currentInstance = getCurrentInstance();

  const iframeRef = ref<HTMLIFrameElement | null>(null);
  const stageRef = ref<HTMLElement | null>(null);
  const fallbackContentRef = ref<HTMLElement | null>(null);
  const useFallbackDom = ref(false);
  const contentRef = ref<HTMLElement | null>(null);
  const iframeDocumentRef = ref<Document | null>(null);
  const iframeWindowRef = ref<Window | null>(null);
  const teardownBridgeParentRef = ref<(() => void) | null>(null);
  const teardownBridgeDomRef = ref<(() => void) | null>(null);
  const resizeObserverRef = ref<ResizeObserver | null>(null);
  const currentViewportSize = ref<IViewportSize>({ width: 0, height: 0 });
  const hasViewportSizeReport = ref(false);

  const selectedRect = ref<OverlayRect | null>(null);
  const hoveredRect = ref<OverlayRect | null>(null);
  const dropRect = ref<OverlayRect | null>(null);
  const contextMenuOpen = ref(false);
  const contextMenuNodeId = ref<number | null>(null);
  const contextMenuX = ref(0);
  const contextMenuY = ref(0);
  const canDeleteFromMenu = ref(false);
  const canMoveUpFromMenu = ref(false);
  const canMoveDownFromMenu = ref(false);

  const resolvedViewportDimensions = computed<IViewportSize>(() => {
    if (props.viewport === 'custom') {
      return {
        width: Math.max(MIN_VIEWPORT_WIDTH, Math.round(props.viewportWidth ?? VIEWPORT_PRESETS.desktop.width)),
        height: Math.max(MIN_VIEWPORT_HEIGHT, Math.round(props.viewportHeight ?? VIEWPORT_PRESETS.desktop.height)),
      };
    }

    const preset = VIEWPORT_PRESETS[props.viewport];
    return { width: preset.width, height: preset.height };
  });

  const canvasStyle = computed(() => {
    if (props.viewport === 'desktop') {
      return {
        width: '100%',
        height: '100%',
      };
    }
    return {
      width: `min(100%, ${resolvedViewportDimensions.value.width}px)`,
      height: `${resolvedViewportDimensions.value.height}px`,
    };
  });

  const selectedOverlayStyle = computed<CSSProperties | null>(() =>
    selectedRect.value
      ? {
          top: `${selectedRect.value.top}px`,
          left: `${selectedRect.value.left}px`,
          width: `${selectedRect.value.width}px`,
          height: `${selectedRect.value.height}px`,
        }
      : null,
  );

  const hoveredOverlayStyle = computed<CSSProperties | null>(() =>
    hoveredRect.value && props.hoveredNodeId !== props.selectedNodeId
      ? {
          top: `${hoveredRect.value.top}px`,
          left: `${hoveredRect.value.left}px`,
          width: `${hoveredRect.value.width}px`,
          height: `${hoveredRect.value.height}px`,
        }
      : null,
  );

  const dropOverlayStyle = computed<CSSProperties | null>(() =>
    dropRect.value
      ? {
          top: `${dropRect.value.top}px`,
          left: `${dropRect.value.left}px`,
          width: `${dropRect.value.width}px`,
          height: `${dropRect.value.height}px`,
        }
      : null,
  );

  function isElementTarget(target: EventTarget | null): target is Element {
    if (!target || typeof target !== 'object') return false;
    const maybeNode = target as { nodeType?: number };
    return maybeNode.nodeType === 1;
  }

  function parseNodeId(value: string | null): number | null {
    if (value === null) return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  function getNodeIdFromEventTarget(target: EventTarget | null): number | null {
    if (!isElementTarget(target)) return null;
    const marker = target.closest('[data-ipb-node-id]');
    return parseNodeId(marker?.getAttribute('data-ipb-node-id') ?? null);
  }

  function findMarkedElement(nodeId: number | null): Element | null {
    if (nodeId === null || !contentRef.value) return null;
    return contentRef.value.querySelector(`[data-ipb-node-id="${nodeId}"]`);
  }

  function getOverlayRect(element: Element | null): OverlayRect | null {
    if (!element || !contentRef.value) return null;
    const nodeRect = element.getBoundingClientRect();

    if (useFallbackDom.value) {
      const contentRect = contentRef.value.getBoundingClientRect();
      return {
        top: nodeRect.top - contentRect.top,
        left: nodeRect.left - contentRect.left,
        width: nodeRect.width,
        height: nodeRect.height,
      };
    }

    // Iframe mode: getBoundingClientRect() returns coords relative to the iframe
    // viewport, which maps 1:1 to the stage (the overlay's positioned ancestor).
    return {
      top: nodeRect.top,
      left: nodeRect.left,
      width: nodeRect.width,
      height: nodeRect.height,
    };
  }

  function clampIndex(index: number, max: number): number {
    return Math.max(0, Math.min(index, max));
  }

  function isNodeInSubtree(root: INode, maybeNodeId: number): boolean {
    if (root.id === maybeNodeId) return true;
    return root.children.some((child) => isNodeInSubtree(child, maybeNodeId));
  }

  function getDraggedComponentName(state: { sourceNodeId: number | null; sourceComponentName: string | null }): string | null {
    if (state.sourceComponentName) return state.sourceComponentName;
    if (state.sourceNodeId === null) return null;
    return findNodeById(props.tree, state.sourceNodeId)?.name ?? null;
  }

  function resolveDropLocation(
    targetNodeId: number | null,
    state: { sourceNodeId: number | null; sourceComponentName: string | null },
  ): DropLocation | null {
    const sourceName = getDraggedComponentName(state);
    if (!sourceName) return null;

    const targetNode = targetNodeId === null ? null : findNodeById(props.tree, targetNodeId);
    if (targetNode && !targetNode.readonly) {
      const directSlot = normalizeDropSlot(targetNode, 'default', sourceName);
      if (directSlot) {
        return {
          targetId: targetNode.id,
          index: targetNode.children.length,
          slot: directSlot,
        };
      }
    }

    if (targetNodeId !== null) {
      const parentResult = findParent(props.tree, targetNodeId);
      if (parentResult && !parentResult.parent.readonly) {
        const targetChild = parentResult.parent.children[parentResult.index];
        const slot = normalizeDropSlot(parentResult.parent, targetChild?.slot ?? 'default', sourceName);
        if (slot) {
          return {
            targetId: parentResult.parent.id,
            index: parentResult.index + 1,
            slot,
          };
        }
      }
    }

    if (props.tree.readonly) return null;
    const rootSlot = normalizeDropSlot(props.tree, 'default', sourceName);
    if (!rootSlot) return null;

    return {
      targetId: props.tree.id,
      index: props.tree.children.length,
      slot: rootSlot,
    };
  }

  function canMoveNode(
    sourceNodeId: number,
    targetId: number,
    slot: string,
    proposedIndex: number,
  ): { valid: true; index: number; slot: string } | { valid: false } {
    const sourceNode = findNodeById(props.tree, sourceNodeId);
    const sourceParentResult = findParent(props.tree, sourceNodeId);
    const targetNode = findNodeById(props.tree, targetId);

    if (!sourceNode || !sourceParentResult || sourceNode.readonly) return { valid: false };
    if (!targetNode || targetNode.readonly) return { valid: false };
    if (sourceNodeId === targetId) return { valid: false };
    if (isNodeInSubtree(sourceNode, targetId)) return { valid: false };

    const normalizedSlot = normalizeDropSlot(targetNode, slot, sourceNode.name);
    if (!normalizedSlot) return { valid: false };

    const targetChildrenCount = targetNode.children.length;
    if (sourceParentResult.parent.id === targetId && sourceParentResult.index < proposedIndex) {
      return { valid: true, index: clampIndex(proposedIndex - 1, targetChildrenCount), slot: normalizedSlot };
    }

    return { valid: true, index: clampIndex(proposedIndex, targetChildrenCount), slot: normalizedSlot };
  }

  function ensureIframeBaseStyle(doc: Document) {
    if (doc.getElementById(IFRAME_BASE_STYLE_ID)) return;
    const styleEl = doc.createElement('style');
    styleEl.id = IFRAME_BASE_STYLE_ID;
    styleEl.textContent = `
      html, body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        overflow-x: hidden;
      }

      body {
        background: #fff;
      }

      #${IFRAME_CONTENT_ROOT_ID} {
        position: relative;
        width: 100%;
        max-width: 100%;
        min-height: 100%;
        overflow-x: hidden;
        box-sizing: border-box;
      }

      /* Restore list markers that CSS resets may strip */
      ul { list-style-type: disc; padding-left: 1.5em; }
      ol { list-style-type: decimal; padding-left: 1.5em; }
      li { display: list-item; }

      /* Minimum size for layout containers so empty columns/rows remain droppable in the editor */
      [data-ipb-component="PbColumn"] {
        min-width: 80px;
        min-height: 80px;
      }
      [data-ipb-component="PbRow"] {
        min-height: 80px;
      }

      [data-ipb-readonly="true"] {
        opacity: 0.8;
        pointer-events: none;
        user-select: none;
      }

      [data-ipb-readonly="true"] [data-ipb-node-id]:not([data-ipb-readonly="true"]) {
        pointer-events: auto;
        user-select: auto;
        opacity: 1;
      }
    `;
    doc.head.appendChild(styleEl);
  }

  function ensureIframeContentRoot(doc: Document): HTMLElement | null {
    if (!doc.body) return null;
    ensureIframeBaseStyle(doc);

    let root = doc.getElementById(IFRAME_CONTENT_ROOT_ID) as HTMLElement | null;
    if (!root) {
      root = doc.createElement('div');
      root.id = IFRAME_CONTENT_ROOT_ID;
      doc.body.innerHTML = '';
      doc.body.appendChild(root);
    }
    return root;
  }

  function renderIframeNodeTree() {
    if (!contentRef.value) return;
    const vnode = h(NodeRenderer, {
      node: props.tree,
      variables: props.variables,
      markNodes: true,
    });
    if (currentInstance?.appContext) {
      vnode.appContext = currentInstance.appContext;
    }
    render(vnode, contentRef.value);
  }

  function unmountIframeNodeTree() {
    if (!contentRef.value) return;
    render(null, contentRef.value);
  }

  function syncDraggableMarkers() {
    if (!contentRef.value) return;

    const markers = contentRef.value.querySelectorAll<HTMLElement>('[data-ipb-node-id]');
    markers.forEach((element) => {
      const nodeId = parseNodeId(element.getAttribute('data-ipb-node-id'));
      const node = nodeId === null ? null : findNodeById(props.tree, nodeId);
      element.draggable = Boolean(node && !node.readonly && node.id !== props.tree.id);
    });
  }

  function syncOverlayRects() {
    selectedRect.value = getOverlayRect(findMarkedElement(props.selectedNodeId));
    hoveredRect.value = getOverlayRect(findMarkedElement(props.hoveredNodeId));
    const dropTargetId = dragDrop ? dragDrop.dragState.value.dropTargetId : null;
    dropRect.value = dropTargetId === null ? null : getOverlayRect(findMarkedElement(dropTargetId));
  }

  function getStageViewportSize(): IViewportSize {
    if (stageRef.value) {
      return {
        width: Math.round(stageRef.value.clientWidth),
        height: Math.round(stageRef.value.clientHeight),
      };
    }

    return {
      width: 0,
      height: 0,
    };
  }

  function syncViewportSize() {
    const nextSize = getStageViewportSize();
    if (
      hasViewportSizeReport.value &&
      nextSize.width === currentViewportSize.value.width &&
      nextSize.height === currentViewportSize.value.height
    ) {
      return;
    }

    currentViewportSize.value = nextSize;
    hasViewportSizeReport.value = true;
    emit('viewport-size-change', nextSize);
  }

  function handleCanvasResize() {
    syncOverlayRects();
    syncViewportSize();
  }

  function disconnectResizeObserver() {
    resizeObserverRef.value?.disconnect();
    resizeObserverRef.value = null;
  }

  function setupResizeObserver() {
    disconnectResizeObserver();
    if (typeof ResizeObserver === 'undefined') return;
    if (!stageRef.value || !contentRef.value) return;

    const observer = new ResizeObserver(() => {
      handleCanvasResize();
    });

    observer.observe(stageRef.value);
    observer.observe(contentRef.value);

    resizeObserverRef.value = observer;
  }

  async function syncOverlayRectsAfterRender() {
    await nextTick();
    renderIframeNodeTree();
    await nextTick();
    syncDraggableMarkers();
    syncOverlayRects();
    syncViewportSize();
  }

  function clearDropTargetOverlay() {
    dropRect.value = null;
  }

  function hideContextMenu() {
    contextMenuOpen.value = false;
    contextMenuNodeId.value = null;
  }

  function handleCanvasClick() {
    hideContextMenu();
    emit('select', null);
    emit('hover', null);
  }

  function handleContentClick(event: MouseEvent) {
    event.stopPropagation();
    hideContextMenu();
    const nodeId = getNodeIdFromEventTarget(event.target);
    if (nodeId !== null && !findNodeById(props.tree, nodeId)) {
      emit('select', null);
      return;
    }
    emit('select', nodeId);
  }

  function handleContentMouseMove(event: MouseEvent) {
    const nodeId = getNodeIdFromEventTarget(event.target);
    if (nodeId !== null && !findNodeById(props.tree, nodeId)) {
      if (props.hoveredNodeId !== null) emit('hover', null);
      return;
    }
    if (nodeId !== props.hoveredNodeId) {
      emit('hover', nodeId);
    }
  }

  function handleContentMouseLeave() {
    emit('hover', null);
  }

  function handleContentDragStart(event: DragEvent) {
    if (!dragDrop) return;
    const nodeId = getNodeIdFromEventTarget(event.target);
    if (nodeId === null) return;

    const node = findNodeById(props.tree, nodeId);
    if (!node || node.readonly || node.id === props.tree.id) {
      event.preventDefault();
      return;
    }

    dragDrop.startDragExisting(nodeId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(nodeId));
    }
  }

  function handleContentDragOver(event: DragEvent) {
    if (!dragDrop || !dragDrop.dragState.value.isDragging) return;

    const targetNodeId = getNodeIdFromEventTarget(event.target);
    const location = resolveDropLocation(targetNodeId, dragDrop.dragState.value);
    if (!location) {
      clearDropTargetOverlay();
      return;
    }

    event.preventDefault();
    dragDrop.updateDropTarget(location.targetId, location.index, location.slot);
    dropRect.value = getOverlayRect(findMarkedElement(location.targetId));
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = dragDrop.dragState.value.isNewComponent ? 'copy' : 'move';
    }
  }

  function handleContentDragLeave(event: DragEvent) {
    if (!contentRef.value) return;
    const nextTarget = event.relatedTarget;
    if (nextTarget && typeof nextTarget === 'object' && 'nodeType' in nextTarget) {
      if (contentRef.value.contains(nextTarget as Node)) return;
    }
    clearDropTargetOverlay();
  }

  function handleContentDrop(event: DragEvent) {
    event.preventDefault();

    if (!dragDrop || !nodeTree || !dragDrop.dragState.value.isDragging) {
      clearDropTargetOverlay();
      return;
    }

    const targetNodeId = getNodeIdFromEventTarget(event.target);
    const location = resolveDropLocation(targetNodeId, dragDrop.dragState.value);
    if (!location) {
      dragDrop.cancelDrag();
      clearDropTargetOverlay();
      return;
    }

    dragDrop.updateDropTarget(location.targetId, location.index, location.slot);
    const finalState = dragDrop.endDrag();
    clearDropTargetOverlay();

    if (finalState.dropTargetId === null) return;

    if (finalState.isNewComponent && finalState.sourceComponentName) {
      const defaultProps = getComponent(finalState.sourceComponentName)?.defaultProps;
      const newNodeId = nodeTree.addNode(
        finalState.dropTargetId,
        finalState.sourceComponentName,
        finalState.dropIndex,
        finalState.dropSlot,
        defaultProps,
      );
      if (newNodeId !== null) {
        emit('select', newNodeId);
      }
      return;
    }

    if (finalState.sourceNodeId === null) return;

    const moveResult = canMoveNode(
      finalState.sourceNodeId,
      finalState.dropTargetId,
      finalState.dropSlot,
      finalState.dropIndex,
    );
    if (!moveResult.valid) return;

    nodeTree.moveNodeTo(
      finalState.sourceNodeId,
      finalState.dropTargetId,
      moveResult.index,
      moveResult.slot,
    );
    emit('select', finalState.sourceNodeId);
  }

  function handleContentDragEnd() {
    if (dragDrop?.dragState.value.isDragging) {
      dragDrop.cancelDrag();
    }
    clearDropTargetOverlay();
  }

  function updateContextMenuCapabilities(nodeId: number) {
    const node = findNodeById(props.tree, nodeId);
    if (node?.readonly) {
      canDeleteFromMenu.value = false;
      canMoveUpFromMenu.value = false;
      canMoveDownFromMenu.value = false;
      return;
    }

    const parentResult = findParent(props.tree, nodeId);
    if (!parentResult) {
      canDeleteFromMenu.value = false;
      canMoveUpFromMenu.value = false;
      canMoveDownFromMenu.value = false;
      return;
    }

    canDeleteFromMenu.value = true;
    canMoveUpFromMenu.value = parentResult.index > 0;
    canMoveDownFromMenu.value = parentResult.index < parentResult.parent.children.length - 1;
  }

  function handleContentContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const nodeId = getNodeIdFromEventTarget(event.target);
    if (nodeId === null || !contentRef.value || !findNodeById(props.tree, nodeId)) {
      hideContextMenu();
      return;
    }

    const contentRect = contentRef.value.getBoundingClientRect();
    contextMenuX.value = event.clientX - contentRect.left;
    contextMenuY.value = event.clientY - contentRect.top;
    contextMenuNodeId.value = nodeId;
    updateContextMenuCapabilities(nodeId);
    contextMenuOpen.value = true;

    emit('select', nodeId);
  }

  function handleContextMenuAction(action: NodeContextMenuAction) {
    if (contextMenuNodeId.value === null) return;
    emit('context-action', { action, nodeId: contextMenuNodeId.value });
    hideContextMenu();
  }

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!isElementTarget(target)) return false;
    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
    return Boolean(target.closest('[contenteditable]:not([contenteditable="false"])'));
  }

  function handleBridgePointer(payload: IframeBridgePointerPayload) {
    if (payload.interaction === 'hover') {
      if (payload.nodeId !== null && !findNodeById(props.tree, payload.nodeId)) {
        if (props.hoveredNodeId !== null) emit('hover', null);
        return;
      }
      if (payload.nodeId !== props.hoveredNodeId) {
        emit('hover', payload.nodeId);
      }
      return;
    }

    if (payload.interaction === 'select') {
      hideContextMenu();
      if (payload.nodeId !== null && !findNodeById(props.tree, payload.nodeId)) {
        emit('select', null);
        return;
      }
      emit('select', payload.nodeId);
      return;
    }

    if (payload.interaction !== 'context') return;

    if (payload.nodeId === null || !contentRef.value || !findNodeById(props.tree, payload.nodeId)) {
      hideContextMenu();
      return;
    }

    contextMenuX.value = payload.clientX;
    contextMenuY.value = payload.clientY;
    contextMenuNodeId.value = payload.nodeId;
    updateContextMenuCapabilities(payload.nodeId);
    contextMenuOpen.value = true;

    emit('select', payload.nodeId);
  }

  function handleBridgeKeydown(payload: IframeBridgeKeydownPayload) {
    if (payload.key === 'Escape') {
      hideContextMenu();
    }

    emit('iframe-keydown', {
      ...payload,
      // Preventing defaults from the parent is asynchronous in postMessage mode.
      preventDefault: () => {},
    });
  }

  function getWindowOrigin(targetWindow: Window): string {
    try {
      return targetWindow.location.origin;
    } catch {
      return window.location.origin;
    }
  }

  function teardownIframeBridge() {
    teardownBridgeParentRef.value?.();
    teardownBridgeParentRef.value = null;

    teardownBridgeDomRef.value?.();
    teardownBridgeDomRef.value = null;
  }

  function setupIframeBridge() {
    const frameWindow = iframeWindowRef.value;
    const frameDocument = iframeDocumentRef.value;
    const contentRoot = contentRef.value;
    if (!frameWindow || !frameDocument || !contentRoot) return;

    teardownIframeBridge();
    const sessionToken = createIframeBridgeSessionToken();

    const bridgeParent = createIframeBridgeParent({
      hostWindow: window,
      expectedSource: window,
      expectedOrigin: getWindowOrigin(window),
      expectedSessionToken: sessionToken,
      onReady: () => {
        void syncOverlayRectsAfterRender();
      },
      onPointer: handleBridgePointer,
      onKeydown: handleBridgeKeydown,
    });

    const bridgeChild = createIframeBridgeChild({
      targetWindow: window,
      targetOrigin: getWindowOrigin(window),
      sessionToken,
    });

    teardownBridgeParentRef.value = () => bridgeParent.dispose();
    teardownBridgeDomRef.value = mountIframeBridgeDomListeners({
      frameDocument,
      contentRoot,
      bridge: bridgeChild,
      resolveNodeId: getNodeIdFromEventTarget,
      isEditableTarget,
    });
  }

  function handleWindowResize() {
    handleCanvasResize();
  }

  function teardownIframeListeners() {
    disconnectResizeObserver();
    teardownIframeBridge();

    if (contentRef.value) {
      contentRef.value.removeEventListener('click', handleContentClick);
      contentRef.value.removeEventListener('contextmenu', handleContentContextMenu);
      contentRef.value.removeEventListener('mousemove', handleContentMouseMove);
      contentRef.value.removeEventListener('mouseleave', handleContentMouseLeave);
      contentRef.value.removeEventListener('dragstart', handleContentDragStart);
      contentRef.value.removeEventListener('dragover', handleContentDragOver);
      contentRef.value.removeEventListener('dragleave', handleContentDragLeave);
      contentRef.value.removeEventListener('drop', handleContentDrop);
      contentRef.value.removeEventListener('dragend', handleContentDragEnd);
    }

    if (!useFallbackDom.value && iframeWindowRef.value) {
      iframeWindowRef.value.removeEventListener('scroll', handleWindowResize);
      iframeWindowRef.value.removeEventListener('resize', handleWindowResize);
    }
  }

  function setupIframeListeners() {
    if (!contentRef.value) return;

    if (useFallbackDom.value) {
      contentRef.value.addEventListener('click', handleContentClick);
      contentRef.value.addEventListener('contextmenu', handleContentContextMenu);
      contentRef.value.addEventListener('mousemove', handleContentMouseMove);
      contentRef.value.addEventListener('mouseleave', handleContentMouseLeave);
    } else {
      setupIframeBridge();
    }

    contentRef.value.addEventListener('dragstart', handleContentDragStart);
    contentRef.value.addEventListener('dragover', handleContentDragOver);
    contentRef.value.addEventListener('dragleave', handleContentDragLeave);
    contentRef.value.addEventListener('drop', handleContentDrop);
    contentRef.value.addEventListener('dragend', handleContentDragEnd);

    if (!useFallbackDom.value && iframeWindowRef.value) {
      iframeWindowRef.value.addEventListener('scroll', handleWindowResize);
      iframeWindowRef.value.addEventListener('resize', handleWindowResize);
    }

    setupResizeObserver();
  }

  function initializeFallbackContent() {
    useFallbackDom.value = true;
    void nextTick().then(() => {
      if (!fallbackContentRef.value) return;

      teardownIframeListeners();
      unmountIframeNodeTree();

      iframeDocumentRef.value = null;
      iframeWindowRef.value = null;
      contentRef.value = fallbackContentRef.value;

      setupIframeListeners();
      void syncOverlayRectsAfterRender();
    });
  }

  function initializeIframeDocument() {
    const iframe = iframeRef.value;
    if (!iframe) {
      initializeFallbackContent();
      return;
    }

    const frameDocument = iframe.contentDocument;
    const frameWindow = iframe.contentWindow;
    if (!frameDocument || !frameWindow) {
      initializeFallbackContent();
      return;
    }

    const frameRoot = ensureIframeContentRoot(frameDocument);
    if (!frameRoot) {
      initializeFallbackContent();
      return;
    }

    teardownIframeListeners();
    unmountIframeNodeTree();

    useFallbackDom.value = false;
    iframeDocumentRef.value = frameDocument;
    iframeWindowRef.value = frameWindow;
    contentRef.value = frameRoot;

    setupIframeListeners();
    void syncOverlayRectsAfterRender();
  }

  watch(
    () => [props.selectedNodeId, props.hoveredNodeId],
    () => {
      void syncOverlayRectsAfterRender();
    },
    { immediate: true },
  );

  watch(
    () => [props.viewport, props.viewportWidth, props.viewportHeight],
    () => {
      void syncOverlayRectsAfterRender();
    },
  );

  watch(
    () => props.tree,
    () => {
      if (contextMenuNodeId.value !== null && !findNodeById(props.tree, contextMenuNodeId.value)) {
        hideContextMenu();
      }
      void syncOverlayRectsAfterRender();
    },
    { deep: true },
  );

  watch(
    () => props.variables,
    () => {
      void syncOverlayRectsAfterRender();
    },
    { deep: true },
  );

  watch(
    () => props.tree,
    () => {
      void syncOverlayRectsAfterRender();
    },
    { deep: true },
  );

  watch(
    () => dragDrop?.dragState.value.isDragging ?? false,
    (isDragging) => {
      if (!isDragging) {
        clearDropTargetOverlay();
      }
    },
  );

  onMounted(() => {
    window.addEventListener('resize', handleWindowResize);
    iframeRef.value?.addEventListener('load', initializeIframeDocument);
    initializeIframeDocument();
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleWindowResize);
    iframeRef.value?.removeEventListener('load', initializeIframeDocument);
    teardownIframeListeners();
    unmountIframeNodeTree();
  });
</script>

<template>
  <main class="ipb-canvas" :class="{ 'ipb-canvas--desktop': viewport === 'desktop' }" @click="handleCanvasClick" @contextmenu.prevent="hideContextMenu">
    <div class="ipb-canvas__viewport" :style="canvasStyle">
      <div ref="stageRef" class="ipb-iframe-canvas__stage">
        <iframe
          v-if="!useFallbackDom"
          ref="iframeRef"
          class="ipb-iframe-canvas__frame"
          :title="t('iframeCanvas.title')"
          sandbox="allow-same-origin"
        />
        <div
          v-else
          ref="fallbackContentRef"
          id="ipb-iframe-canvas-content"
          class="ipb-iframe-canvas__fallback"
        />
        <div
          v-if="dropOverlayStyle"
          class="ipb-canvas__overlay ipb-canvas__overlay--drop"
          :style="dropOverlayStyle"
        />
        <div
          v-if="hoveredOverlayStyle"
          class="ipb-canvas__overlay ipb-canvas__overlay--hovered"
          :style="hoveredOverlayStyle"
        />
        <div
          v-if="selectedOverlayStyle"
          class="ipb-canvas__overlay ipb-canvas__overlay--selected"
          :style="selectedOverlayStyle"
        />
        <NodeContextMenu
          :open="contextMenuOpen"
          :x="contextMenuX"
          :y="contextMenuY"
          :can-delete="canDeleteFromMenu"
          :can-move-up="canMoveUpFromMenu"
          :can-move-down="canMoveDownFromMenu"
          @action="handleContextMenuAction"
          @close="hideContextMenu"
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
  .ipb-canvas {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 24px;
    overflow: auto;
    background: var(--ipb-canvas-bg, #e5e7eb);
  }

  .ipb-canvas--desktop {
    padding: 0;
  }

  .ipb-canvas__viewport {
    position: relative;
    flex: 0 0 auto;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);
    border-radius: 4px;
    overflow: hidden;
    transition: width 0.2s ease, height 0.2s ease;
  }

  .ipb-canvas--desktop .ipb-canvas__viewport {
    box-shadow: none;
    border-radius: 0;
  }

  .ipb-iframe-canvas__stage {
    position: relative;
    width: 100%;
    height: 100%;
    background: #fff;
  }

  .ipb-iframe-canvas__frame {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
    background: #fff;
  }

  .ipb-iframe-canvas__fallback {
    position: relative;
    width: 100%;
    height: 100%;
    background: #fff;
  }

  .ipb-canvas__overlay {
    position: absolute;
    pointer-events: none;
    border-radius: 4px;
    box-sizing: border-box;
  }

  .ipb-canvas__overlay--hovered {
    border: 1px dashed rgba(59, 130, 246, 0.75);
    background: rgba(59, 130, 246, 0.08);
    z-index: 10;
  }

  .ipb-canvas__overlay--drop {
    border: 2px dashed rgba(16, 185, 129, 0.9);
    background: rgba(16, 185, 129, 0.14);
    z-index: 12;
  }

  .ipb-canvas__overlay--selected {
    border: 2px solid rgba(37, 99, 235, 0.95);
    background: rgba(37, 99, 235, 0.14);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.85) inset;
    z-index: 11;
  }
</style>
