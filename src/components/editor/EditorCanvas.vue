<script setup lang="ts">
  import {
    computed,
    inject,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
    type CSSProperties,
    type PropType,
  } from 'vue';
  import { normalizeDropSlot } from '@/core/drop-slot';
  import { getComponent } from '@/core/registry';
  import { findNodeById, findParent } from '@/core/tree';
  import { DRAG_DROP_KEY, NODE_TREE_KEY } from '@/types/keys';
  import type { INode } from '@/types/node';
  import type { ViewportPreset } from '@/types/editor';
  import { VIEWPORT_PRESETS } from '@/types/editor';
  import NodeRenderer from '../reader/NodeRenderer.vue';
  import NodeContextMenu, { type NodeContextMenuAction } from './NodeContextMenu.vue';

  const props = defineProps({
    content: { type: Object as PropType<INode>, required: true },
    variables: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
    selectedNodeId: { type: Number as PropType<number | null>, default: null },
    hoveredNodeId: { type: Number as PropType<number | null>, default: null },
    viewport: { type: String as PropType<ViewportPreset>, default: 'desktop' },
  });

  const emit = defineEmits<{
    select: [nodeId: number | null];
    hover: [nodeId: number | null];
    'context-action': [payload: { action: NodeContextMenuAction; nodeId: number }];
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

  const nodeTree = inject(NODE_TREE_KEY, null);
  const dragDrop = inject(DRAG_DROP_KEY, null);

  const contentRef = ref<HTMLElement | null>(null);
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

  const canvasStyle = computed(() => {
    const dims = VIEWPORT_PRESETS[props.viewport];
    if (props.viewport === 'desktop') {
      return { width: '100%', height: '100%' };
    }
    return {
      width: `${dims.width}px`,
      height: `${dims.height}px`,
      maxWidth: '100%',
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

  function parseNodeId(value: string | null): number | null {
    if (value === null) return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  function getNodeIdFromEventTarget(target: EventTarget | null): number | null {
    if (!(target instanceof Element)) return null;
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
    const contentRect = contentRef.value.getBoundingClientRect();

    return {
      top: nodeRect.top - contentRect.top + contentRef.value.scrollTop,
      left: nodeRect.left - contentRect.left + contentRef.value.scrollLeft,
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
    return findNodeById(props.content, state.sourceNodeId)?.name ?? null;
  }

  function resolveDropLocation(
    targetNodeId: number | null,
    state: { sourceNodeId: number | null; sourceComponentName: string | null },
  ): DropLocation | null {
    const sourceName = getDraggedComponentName(state);
    if (!sourceName) return null;

    const targetNode = targetNodeId === null ? null : findNodeById(props.content, targetNodeId);
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
      const parentResult = findParent(props.content, targetNodeId);
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

    if (props.content.readonly) return null;
    const rootSlot = normalizeDropSlot(props.content, 'default', sourceName);
    if (!rootSlot) return null;

    return {
      targetId: props.content.id,
      index: props.content.children.length,
      slot: rootSlot,
    };
  }

  function canMoveNode(
    sourceNodeId: number,
    targetId: number,
    slot: string,
    proposedIndex: number,
  ): { valid: true; index: number; slot: string } | { valid: false } {
    const sourceNode = findNodeById(props.content, sourceNodeId);
    const sourceParentResult = findParent(props.content, sourceNodeId);
    const targetNode = findNodeById(props.content, targetId);

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

  function syncDraggableMarkers() {
    if (!contentRef.value) return;

    const markers = contentRef.value.querySelectorAll<HTMLElement>('[data-ipb-node-id]');
    markers.forEach((element) => {
      const nodeId = parseNodeId(element.getAttribute('data-ipb-node-id'));
      const node = nodeId === null ? null : findNodeById(props.content, nodeId);
      element.draggable = Boolean(node && !node.readonly && node.id !== props.content.id);
    });
  }

  function syncOverlayRects() {
    selectedRect.value = getOverlayRect(findMarkedElement(props.selectedNodeId));
    hoveredRect.value = getOverlayRect(findMarkedElement(props.hoveredNodeId));
    const dropTargetId = dragDrop ? dragDrop.dragState.value.dropTargetId : null;
    dropRect.value = dropTargetId === null ? null : getOverlayRect(findMarkedElement(dropTargetId));
  }

  async function syncOverlayRectsAfterRender() {
    await nextTick();
    syncDraggableMarkers();
    syncOverlayRects();
  }

  function clearDropTargetOverlay() {
    dropRect.value = null;
  }

  function handleCanvasClick() {
    hideContextMenu();
    emit('select', null);
    emit('hover', null);
  }

  function handleContentClick(event: MouseEvent) {
    hideContextMenu();
    const nodeId = getNodeIdFromEventTarget(event.target);
    emit('select', nodeId);
  }

  function handleContentMouseMove(event: MouseEvent) {
    const nodeId = getNodeIdFromEventTarget(event.target);
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

    const node = findNodeById(props.content, nodeId);
    if (!node || node.readonly || node.id === props.content.id) {
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
    if (nextTarget instanceof Node && contentRef.value.contains(nextTarget)) return;
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

  function hideContextMenu() {
    contextMenuOpen.value = false;
    contextMenuNodeId.value = null;
  }

  function updateContextMenuCapabilities(nodeId: number) {
    const node = findNodeById(props.content, nodeId);
    if (node?.readonly) {
      canDeleteFromMenu.value = false;
      canMoveUpFromMenu.value = false;
      canMoveDownFromMenu.value = false;
      return;
    }

    const parentResult = findParent(props.content, nodeId);
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
    const nodeId = getNodeIdFromEventTarget(event.target);
    if (nodeId === null || !contentRef.value) {
      hideContextMenu();
      return;
    }

    const contentRect = contentRef.value.getBoundingClientRect();
    contextMenuX.value = event.clientX - contentRect.left + contentRef.value.scrollLeft;
    contextMenuY.value = event.clientY - contentRect.top + contentRef.value.scrollTop;
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

  function handleWindowResize() {
    syncOverlayRects();
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      hideContextMenu();
    }
  }

  watch(
    () => [props.selectedNodeId, props.hoveredNodeId, props.viewport],
    () => {
      void syncOverlayRectsAfterRender();
    },
    { immediate: true },
  );

  watch(
    () => props.content,
    () => {
      if (contextMenuNodeId.value !== null && !findNodeById(props.content, contextMenuNodeId.value)) {
        hideContextMenu();
      }
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
    window.addEventListener('keydown', handleWindowKeydown);
    void syncOverlayRectsAfterRender();
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleWindowResize);
    window.removeEventListener('keydown', handleWindowKeydown);
  });
</script>

<template>
  <main class="ipb-canvas" @click="handleCanvasClick" @contextmenu.prevent="hideContextMenu">
    <div class="ipb-canvas__viewport" :style="canvasStyle">
      <div
        ref="contentRef"
        class="ipb-canvas__content"
        @click.stop="handleContentClick"
        @contextmenu.stop.prevent="handleContentContextMenu"
        @mousemove="handleContentMouseMove"
        @mouseleave="handleContentMouseLeave"
        @dragstart="handleContentDragStart"
        @dragover="handleContentDragOver"
        @dragleave="handleContentDragLeave"
        @drop="handleContentDrop"
        @dragend="handleContentDragEnd"
      >
        <!-- In full implementation, this renders inside an iframe for style isolation -->
        <NodeRenderer :node="content" :variables="variables" mark-nodes />
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

  .ipb-canvas__viewport {
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);
    border-radius: 4px;
    overflow: hidden;
    transition: width 0.3s ease, height 0.3s ease;
  }

  .ipb-canvas__content {
    position: relative;
    width: 100%;
    min-height: 400px;
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

  /* Minimum size for layout containers so empty columns/rows remain droppable */
  .ipb-canvas__content :deep([data-ipb-component="PbColumn"]) {
    min-width: 80px;
    min-height: 80px;
  }
  .ipb-canvas__content :deep([data-ipb-component="PbRow"]) {
    min-height: 80px;
  }

  .ipb-canvas__content :deep([data-ipb-readonly="true"]) {
    opacity: 0.8;
    pointer-events: none;
    user-select: none;
  }
</style>
