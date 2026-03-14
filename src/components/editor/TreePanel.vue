<script setup lang="ts">
  import { computed, inject, nextTick, ref, watch, type ComponentPublicInstance, type PropType } from 'vue';
  import { normalizeDropSlot } from '@/core/drop-slot';
  import { getComponent } from '@/core/registry';
  import { findNodeById, findParent } from '@/core/tree';
  import { flattenTree } from '@/core/virtual-tree';
  import type { INode } from '@/types/node';
  import { NODE_TREE_KEY, DRAG_DROP_KEY } from '@/types/keys';
  import { usePageBuilderI18n } from '@/i18n';

  type DropZone = 'above' | 'on' | 'below';

  interface TreeRow {
    id: number;
    key: string;
    name: string;
    depth: number;
    readonly: boolean;
  }

  const props = defineProps({
    content: { type: Object as PropType<INode>, required: true },
    selectedNodeId: { type: Number as PropType<number | null>, default: null },
  });

  const emit = defineEmits<{
    select: [nodeId: number];
  }>();
  const { t } = usePageBuilderI18n();

  const nodeTree = inject(NODE_TREE_KEY, null);
  const dragDrop = inject(DRAG_DROP_KEY, null);
  const dropHandled = ref(false);
  const dropTargetRowId = ref<number | null>(null);
  const dropZone = ref<DropZone | null>(null);

  const rootId = computed(() => props.content.id);

  /** Get drop zone from mouse position relative to the row button, or from drop-line element. */
  function getDropZoneFromEvent(
    event: DragEvent,
    rowElement: HTMLElement | undefined,
    fallback: DropZone = 'on',
  ): DropZone {
    const dropZoneEl = (event.target as HTMLElement)?.closest?.('[data-drop-zone]');
    const zoneAttr = dropZoneEl?.getAttribute('data-drop-zone');
    if (zoneAttr === 'above') return 'above';
    if (zoneAttr === 'below') return 'below';
    if (!rowElement) return fallback;
    const rect = rowElement.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const third = rect.height / 3;
    if (y < third) return 'above';
    if (y > 2 * third) return 'below';
    return 'on';
  }

  /** Resolve parent id, index and slot when dropping above or below a row (sibling position). */
  function getSiblingDropTarget(rowId: number, zone: 'above' | 'below'): { parentId: number; index: number; slot: string } | null {
    const rowNode = findNodeById(props.content, rowId);
    if (!rowNode) return null;
    const slot = rowNode.slot ?? 'default';
    const parentResult = findParent(props.content, rowId);
    if (!parentResult) {
      // Row is root: above = index 0, below = last
      const parentId = props.content.id;
      const index = zone === 'above' ? 0 : props.content.children.length;
      return { parentId, index, slot: 'default' };
    }
    const index = zone === 'above' ? parentResult.index : parentResult.index + 1;
    return { parentId: parentResult.parent.id, index, slot };
  }

  function isNodeInSubtree(node: INode, nodeId: number): boolean {
    if (node.id === nodeId) return true;
    return node.children.some((child) => isNodeInSubtree(child, nodeId));
  }

  function getDraggedComponentName(state: {
    sourceNodeId: number | null;
    sourceComponentName: string | null;
    isNewComponent: boolean;
  }): string | null {
    if (state.sourceComponentName) return state.sourceComponentName;
    if (state.sourceNodeId === null) return null;
    return findNodeById(props.content, state.sourceNodeId)?.name ?? null;
  }

  function isValidDropTarget(
    state: { sourceNodeId: number | null; sourceComponentName: string | null; isNewComponent: boolean },
    targetNodeId: number,
  ): boolean {
    if (state.sourceNodeId === targetNodeId) return false;
    const sourceName = getDraggedComponentName(state);
    if (!sourceName) return false;
    const targetNode = findNodeById(props.content, targetNodeId);
    if (!targetNode || targetNode.readonly) return false;
    if (!state.isNewComponent && state.sourceNodeId !== null) {
      const sourceNode = findNodeById(props.content, state.sourceNodeId);
      if (!sourceNode || sourceNode.readonly) return false;
      if (isNodeInSubtree(sourceNode, targetNodeId)) return false;
    }
    return normalizeDropSlot(targetNode, 'default', sourceName) !== null;
  }

  function isValidSiblingDropTarget(
    state: { sourceNodeId: number | null; sourceComponentName: string | null; isNewComponent: boolean },
    parentId: number,
    slot: string,
  ): boolean {
    const sourceName = getDraggedComponentName(state);
    if (!sourceName) return false;
    const parentNode = findNodeById(props.content, parentId);
    if (!parentNode || parentNode.readonly) return false;
    if (normalizeDropSlot(parentNode, slot, sourceName) === null) return false;
    if (!state.isNewComponent && state.sourceNodeId !== null) {
      const sourceNode = findNodeById(props.content, state.sourceNodeId);
      if (!sourceNode || sourceNode.readonly) return false;
      if (isNodeInSubtree(sourceNode, parentId)) return false;
    }
    return true;
  }

  const rows = computed<TreeRow[]>(() => {
    return flattenTree(props.content).map((row) => ({
      id: row.id,
      key: row.key,
      name: row.node.name,
      depth: row.depth,
      readonly: Boolean(row.node.readonly),
    }));
  });

  const rowButtonRefs = ref(new Map<number, HTMLButtonElement>());

  function setRowButtonRef(nodeId: number, element: Element | ComponentPublicInstance | null) {
    const maybeElement =
      element instanceof HTMLButtonElement
        ? element
        : element && '$el' in element && element.$el instanceof HTMLButtonElement
          ? element.$el
          : null;

    if (maybeElement) {
      rowButtonRefs.value.set(nodeId, maybeElement);
      return;
    }
    rowButtonRefs.value.delete(nodeId);
  }

  function getRowIdFromEventTarget(target: EventTarget | null): number | null {
    if (!(target instanceof HTMLElement)) return null;
    const nodeId = target.dataset.nodeId;
    if (!nodeId) return null;
    const parsed = Number(nodeId);
    return Number.isInteger(parsed) ? parsed : null;
  }

  function getActiveRowIndex(fallbackToFirst = true): number {
    if (rows.value.length === 0) return -1;
    if (props.selectedNodeId !== null) {
      const selectedIndex = rows.value.findIndex((row) => row.id === props.selectedNodeId);
      if (selectedIndex >= 0) return selectedIndex;
    }
    return fallbackToFirst ? 0 : -1;
  }

  function focusRowById(nodeId: number) {
    rowButtonRefs.value.get(nodeId)?.focus();
  }

  function selectRowByIndex(index: number) {
    const row = rows.value[index];
    if (!row) return;
    emit('select', row.id);
    void nextTick(() => {
      focusRowById(row.id);
    });
  }

  function isRowTabStop(rowId: number): boolean {
    const activeIndex = getActiveRowIndex();
    return rows.value[activeIndex]?.id === rowId;
  }

  const canDragDrop = computed(() => Boolean(nodeTree && dragDrop));

  const isDropTargetOn = (rowId: number) =>
    Boolean(
      dragDrop?.dragState.value.isDragging &&
        dropTargetRowId.value === rowId &&
        dropZone.value === 'on',
    );
  const isDropTargetAbove = (rowId: number) =>
    Boolean(
      dragDrop?.dragState.value.isDragging &&
        dropTargetRowId.value === rowId &&
        dropZone.value === 'above',
    );
  const isDropTargetBelow = (rowId: number) =>
    Boolean(
      dragDrop?.dragState.value.isDragging &&
        dropTargetRowId.value === rowId &&
        dropZone.value === 'below',
    );

  function isRowDraggable(row: TreeRow): boolean {
    if (!canDragDrop.value || row.readonly) return false;
    return row.id !== rootId.value;
  }

  function handleTreeDragStart(row: TreeRow, event: DragEvent) {
    if (!dragDrop || !isRowDraggable(row)) return;
    dropHandled.value = false;
    dragDrop.startDragExisting(row.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-ipb-node-id', String(row.id));
      event.dataTransfer.setData('text/plain', String(row.id));
    }
  }

  function handleTreeDragOver(row: TreeRow, event: DragEvent) {
    if (!dragDrop || !dragDrop.dragState.value.isDragging) return;
    const state = dragDrop.dragState.value;
    const zone = getDropZoneFromEvent(event, rowButtonRefs.value.get(row.id));

    if (zone === 'on') {
      if (!isValidDropTarget(state, row.id)) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = state.isNewComponent ? 'copy' : 'move';
      }
      dropTargetRowId.value = row.id;
      dropZone.value = 'on';
      dragDrop.updateDropTarget(row.id, 0, 'default');
      return;
    }

    const siblingTarget = getSiblingDropTarget(row.id, zone);
    if (!siblingTarget || !isValidSiblingDropTarget(state, siblingTarget.parentId, siblingTarget.slot)) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = state.isNewComponent ? 'copy' : 'move';
    }
    dropTargetRowId.value = row.id;
    dropZone.value = zone;
    dragDrop.updateDropTarget(siblingTarget.parentId, siblingTarget.index, siblingTarget.slot);
  }

  function handleTreeDrop(row: TreeRow, event: DragEvent) {
    event.preventDefault();
    if (!nodeTree || !dragDrop || !dragDrop.dragState.value.isDragging) return;
    const state = dragDrop.dragState.value;
    // Prefer stored zone when we're dropping on the row we were hovering (line was visible)
    const storedZone =
      dropTargetRowId.value === row.id && dropZone.value ? dropZone.value : null;
    const zone = storedZone ?? getDropZoneFromEvent(event, rowButtonRefs.value.get(row.id), 'on');

    if (zone === 'on') {
      const targetNode = findNodeById(props.content, row.id);
      if (!targetNode || !isValidDropTarget(state, row.id)) {
        dragDrop.cancelDrag();
        return;
      }
      const sourceName = getDraggedComponentName(state);
      const slot = sourceName ? normalizeDropSlot(targetNode, 'default', sourceName) ?? 'default' : 'default';

      if (state.isNewComponent && state.sourceComponentName) {
        const defaultProps = getComponent(state.sourceComponentName)?.defaultProps;
        const newNodeId = nodeTree.addNode(row.id, state.sourceComponentName, 0, slot, defaultProps);
        dropHandled.value = true;
        dragDrop.endDrag();
        if (newNodeId !== null) emit('select', newNodeId);
        return;
      }
      if (state.sourceNodeId === null) return;
      nodeTree.moveNodeTo(state.sourceNodeId, row.id, 0, slot);
      dropHandled.value = true;
      dragDrop.endDrag();
      emit('select', state.sourceNodeId);
      return;
    }

    const siblingTarget = getSiblingDropTarget(row.id, zone);
    if (!siblingTarget || !isValidSiblingDropTarget(state, siblingTarget.parentId, siblingTarget.slot)) {
      dragDrop.cancelDrag();
      return;
    }
    const parentNode = findNodeById(props.content, siblingTarget.parentId);
    const sourceName = getDraggedComponentName(state);
    const slot =
      parentNode && sourceName
        ? normalizeDropSlot(parentNode, siblingTarget.slot, sourceName) ?? siblingTarget.slot
        : siblingTarget.slot;

    if (state.isNewComponent && state.sourceComponentName) {
      const defaultProps = getComponent(state.sourceComponentName)?.defaultProps;
      const newNodeId = nodeTree.addNode(
        siblingTarget.parentId,
        state.sourceComponentName,
        siblingTarget.index,
        slot,
        defaultProps,
      );
      dropHandled.value = true;
      dragDrop.endDrag();
      if (newNodeId !== null) emit('select', newNodeId);
      return;
    }
    if (state.sourceNodeId === null) return;
    // When moving within same parent, removal shifts indices: insert index must be adjusted
    let insertIndex = siblingTarget.index;
    const sourceParent = findParent(props.content, state.sourceNodeId);
    if (
      sourceParent &&
      sourceParent.parent.id === siblingTarget.parentId &&
      sourceParent.index < siblingTarget.index
    ) {
      insertIndex = siblingTarget.index - 1;
    }
    nodeTree.moveNodeTo(state.sourceNodeId, siblingTarget.parentId, insertIndex, slot);
    dropHandled.value = true;
    dragDrop.endDrag();
    emit('select', state.sourceNodeId);
  }

  function handleTreeDragEnd() {
    dropTargetRowId.value = null;
    dropZone.value = null;
    if (!dropHandled.value && dragDrop?.dragState.value.isDragging) {
      dragDrop.cancelDrag();
    }
  }

  function handleTreeKeydown(event: KeyboardEvent) {
    if (rows.value.length === 0) return;

    const currentRowId = getRowIdFromEventTarget(event.target);
    const currentIndex =
      currentRowId === null ? getActiveRowIndex() : rows.value.findIndex((row) => row.id === currentRowId);
    if (currentIndex < 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(rows.value.length - 1, currentIndex + 1);
      selectRowByIndex(nextIndex);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = Math.max(0, currentIndex - 1);
      selectRowByIndex(nextIndex);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      selectRowByIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      selectRowByIndex(rows.value.length - 1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectRowByIndex(currentIndex);
    }
  }

  watch(
    () => props.selectedNodeId,
    (selectedNodeId) => {
      if (selectedNodeId === null) return;
      void nextTick(() => {
        focusRowById(selectedNodeId);
      });
    },
  );
</script>

<template>
  <div class="ipb-tree-panel">
    <div class="ipb-tree-panel__list" role="tree" :aria-label="t('treePanel.ariaLabel')" @keydown="handleTreeKeydown">
      <div
        v-for="row in rows"
        :key="row.key"
        class="ipb-tree-panel__row-wrapper"
        @dragover="handleTreeDragOver(row, $event)"
        @drop="handleTreeDrop(row, $event)"
      >
        <div
          v-if="isDropTargetAbove(row.id)"
          class="ipb-tree-panel__drop-line"
          data-drop-zone="above"
          aria-hidden="true"
        />
        <button
          :ref="(element) => setRowButtonRef(row.id, element)"
          type="button"
          class="ipb-tree-panel__item"
          :class="{
            'ipb-tree-panel__item--selected': selectedNodeId === row.id,
            'ipb-tree-panel__item--readonly': row.readonly,
            'ipb-tree-panel__item--drop-target': isDropTargetOn(row.id),
            'ipb-tree-panel__item--draggable': isRowDraggable(row),
          }"
          :style="{ paddingInlineStart: `${row.depth * 16 + 8}px` }"
          :data-node-id="row.id"
          :draggable="isRowDraggable(row)"
          role="treeitem"
          :aria-selected="selectedNodeId === row.id ? 'true' : 'false'"
          :aria-level="row.depth + 1"
          :aria-readonly="row.readonly ? 'true' : 'false'"
          :tabindex="isRowTabStop(row.id) ? 0 : -1"
          @click="emit('select', row.id)"
          @dragstart="handleTreeDragStart(row, $event)"
          @dragend="handleTreeDragEnd"
        >
          <span class="ipb-tree-panel__name">{{ row.name }}</span>
          <span class="ipb-tree-panel__id">#{{ row.id }}</span>
          <span v-if="row.readonly" class="ipb-tree-panel__readonly">{{ t('treePanel.readonly') }}</span>
        </button>
        <div
          v-if="isDropTargetBelow(row.id)"
          class="ipb-tree-panel__drop-line"
          data-drop-zone="below"
          aria-hidden="true"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
  .ipb-tree-panel {
    min-width: 0;
  }

  .ipb-tree-panel__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .ipb-tree-panel__row-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .ipb-tree-panel__drop-line {
    min-height: 8px;
    margin: 0 8px;
    padding: 3px 0;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    cursor: default;
  }

  .ipb-tree-panel__drop-line::before {
    content: '';
    display: block;
    width: 100%;
    height: 2px;
    border-radius: 1px;
    background: var(--ipb-primary-color, #1d4ed8);
  }

  .ipb-tree-panel__item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-width: 0;
    padding: 6px 8px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
    font-size: 12px;
    line-height: 1.3;
  }

  .ipb-tree-panel__item:hover {
    background: var(--ipb-hover-bg, #f5f5f5);
  }

  .ipb-tree-panel__item:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: -1px;
  }

  .ipb-tree-panel__item--selected {
    background: var(--ipb-primary-soft, rgba(37, 99, 235, 0.14));
    color: var(--ipb-primary-color, #1d4ed8);
  }

  .ipb-tree-panel__item--readonly {
    opacity: 0.8;
  }

  .ipb-tree-panel__item--drop-target {
    background: var(--ipb-primary-soft, rgba(37, 99, 235, 0.2));
    outline: 2px dashed var(--ipb-primary-color, #1d4ed8);
    outline-offset: 2px;
  }

  .ipb-tree-panel__item--draggable {
    cursor: grab;
  }

  .ipb-tree-panel__item--draggable:active {
    cursor: grabbing;
  }

  .ipb-tree-panel__name {
    font-weight: 500;
    white-space: nowrap;
  }

  .ipb-tree-panel__id {
    color: var(--ipb-text-muted, #6b7280);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    font-size: 11px;
    white-space: nowrap;
  }

  .ipb-tree-panel__readonly {
    margin-left: auto;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--ipb-text-muted, #6b7280);
    border: 1px solid var(--ipb-border-color, #d1d5db);
    border-radius: 3px;
    padding: 1px 4px;
  }
</style>
