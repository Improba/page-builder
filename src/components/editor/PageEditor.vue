<script setup lang="ts">
  import { provide, onMounted, onUnmounted, ref, type PropType } from 'vue';
  import type { IPageData, INode, IPageSavePayload } from '@/types/node';
  import type { IViewportSize, ViewportPreset } from '@/types/editor';
  import { VIEWPORT_PRESETS } from '@/types/editor';
  import { findNodeById, findParent } from '@/core/tree';
  import { getComponent } from '@/core/registry';
  import { createPageBuilderError, reportDevDiagnostic } from '@/core/errors';
  import { PAGE_BUILDER_KEY, EDITOR_KEY, NODE_TREE_KEY, DRAG_DROP_KEY } from '@/types/keys';
  import { usePageBuilder } from '@/composables/use-page-builder';
  import { useEditor } from '@/composables/use-editor';
  import { useNodeTree } from '@/composables/use-node-tree';
  import { useDragDrop } from '@/composables/use-drag-drop';
  import EditorToolbar from './EditorToolbar.vue';
  import LeftDrawer from './LeftDrawer.vue';
  import RightDrawer from './RightDrawer.vue';
  import IframeCanvas from './IframeCanvas.vue';
  import type { NodeContextMenuAction } from './NodeContextMenu.vue';
  interface CanvasShortcutPayload {
    key: string;
    code: string;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    defaultPrevented: boolean;
    isEditable: boolean;
    preventDefault: () => void;
  }


  const props = defineProps({
    pageData: {
      type: Object as PropType<IPageData>,
      required: true,
    },
  });

  const emit = defineEmits<{
    save: [payload: IPageSavePayload];
    change: [tree: INode];
  }>();

  const pb = usePageBuilder({ initialData: props.pageData, mode: 'edit' });
  const editor = useEditor({ initialSnapshot: pb.getSnapshot() });
  const dragDrop = useDragDrop();

const nodeTree = useNodeTree({
    tree: pb.tree,
    contentRoot: pb.contentRoot,
    contentRootId: pb.contentRootId.value,
    nextId: pb.nextId,
    onUpdate: (newTree) => {
      pb.updateTree(newTree);
      emit('change', newTree);
    },
    onSnapshot: (label) => {
      editor.pushHistory(label, pb.getSnapshot());
    },
  });

  const customViewportWidth = ref(1024);
  const customViewportHeight = ref(768);
  const activeViewportWidth = ref<number | null>(null);
  const activeViewportHeight = ref<number | null>(null);

  function handleSave() {
    const contentNode = findNodeById(pb.tree.value, pb.contentRootId.value);
    emit('save', {
      content: contentNode ?? pb.contentRoot.value,
      maxId: pb.maxId.value,
    });
  }

  function restoreSnapshotAndEmit(snapshot: string | undefined): boolean {
    if (!snapshot) return false;
    try {
      pb.restoreSnapshot(snapshot);
      const selectedNodeId = editor.selectedNodeId.value;
      if (selectedNodeId !== null && !findNodeById(pb.tree.value, selectedNodeId)) {
        editor.selectNode(null);
      }
      emit('change', pb.tree.value);
      return true;
    } catch (error) {
      reportDevDiagnostic(
        'PageEditor.restoreSnapshotAndEmit',
        createPageBuilderError(
          'INVALID_SNAPSHOT',
          '[PageBuilder] Failed to apply history snapshot. Undo/redo step was skipped.',
          {
            cause: error,
            details: {
              snapshotPreview: snapshot.slice(0, 200),
            },
          },
        ),
      );
      return false;
    }
  }

  function handleUndo() {
    restoreSnapshotAndEmit(editor.undo());
  }

  function handleRedo() {
    restoreSnapshotAndEmit(editor.redo());
  }

  function handleDeleteNode(nodeId: number) {
    const node = findNodeById(pb.tree.value, nodeId);
    if (!node || node.readonly) return;
    nodeTree.deleteNode(nodeId);
  }

  function handleDuplicateNode(nodeId: number) {
    const node = findNodeById(pb.tree.value, nodeId);
    if (!node) return;
    nodeTree.duplicateNode(nodeId);
  }

  function handleMoveNodeUp(nodeId: number) {
    const node = findNodeById(pb.tree.value, nodeId);
    if (!node || node.readonly) return;
    if (!nodeTree.canMoveNodeUp(nodeId)) return;
    nodeTree.moveNodeUp(nodeId);
  }

  function handleMoveNodeDown(nodeId: number) {
    const node = findNodeById(pb.tree.value, nodeId);
    if (!node || node.readonly) return;
    if (!nodeTree.canMoveNodeDown(nodeId)) return;
    nodeTree.moveNodeDown(nodeId);
  }

  function handleNodeContextAction(payload: { action: NodeContextMenuAction; nodeId: number }) {
    if (payload.action === 'duplicate') {
      handleDuplicateNode(payload.nodeId);
      return;
    }

    if (payload.action === 'delete') {
      handleDeleteNode(payload.nodeId);
      return;
    }

    if (payload.action === 'move-up') {
      handleMoveNodeUp(payload.nodeId);
      return;
    }

    if (payload.action === 'move-down') {
      handleMoveNodeDown(payload.nodeId);
    }
  }

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!target || typeof target !== 'object') return false;
    if (!('nodeType' in target) || (target as { nodeType?: number }).nodeType !== 1) return false;
    const element = target as Element;
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
    return Boolean(element.closest('[contenteditable]:not([contenteditable="false"])'));
  }

  function handleDeleteSelected() {
    const selectedNodeId = editor.selectedNodeId.value;
    if (selectedNodeId === null) return;
    handleDeleteNode(selectedNodeId);
  }

  function handleShortcut(payload: CanvasShortcutPayload) {
    if (payload.defaultPrevented || payload.isEditable) return;

    const hasModifier = payload.ctrlKey || payload.metaKey;
    const key = payload.key.toLowerCase();
    const code = payload.code.toLowerCase();

    if (hasModifier && key === 'z') {
      payload.preventDefault();
      if (payload.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }

    if (hasModifier && key === 'y') {
      payload.preventDefault();
      handleRedo();
      return;
    }

    if (hasModifier && key === 's') {
      payload.preventDefault();
      handleSave();
      return;
    }

    const isDeleteKey = key === 'delete' || key === 'backspace' || code === 'delete' || code === 'backspace';
    if (isDeleteKey && !payload.ctrlKey && !payload.metaKey && !payload.altKey) {
      payload.preventDefault();
      handleDeleteSelected();
    }
  }

  function handleEditorKeydown(event: KeyboardEvent) {
    handleShortcut({
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      defaultPrevented: event.defaultPrevented,
      isEditable: isEditableTarget(event.target) || isEditableTarget(document.activeElement),
      preventDefault: () => event.preventDefault(),
    });
  }

  function handleIframeKeydown(payload: CanvasShortcutPayload) {
    handleShortcut(payload);
  }

  function getViewportDimensions(preset: ViewportPreset): IViewportSize {
    const dimensions = VIEWPORT_PRESETS[preset];
    if (preset === 'custom') {
      return {
        width: customViewportWidth.value,
        height: customViewportHeight.value,
      };
    }

    return {
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  function handleViewportChange(preset: ViewportPreset) {
    if (preset === 'custom' && editor.viewport.value !== 'custom') {
      if (activeViewportWidth.value !== null && activeViewportHeight.value !== null) {
        customViewportWidth.value = activeViewportWidth.value;
        customViewportHeight.value = activeViewportHeight.value;
      } else {
        const currentViewport = getViewportDimensions(editor.viewport.value);
        customViewportWidth.value = currentViewport.width;
        customViewportHeight.value = currentViewport.height;
      }
    }
    editor.setViewport(preset);
  }

  function handleCustomViewportChange(payload: IViewportSize) {
    customViewportWidth.value = payload.width;
    customViewportHeight.value = payload.height;
    if (editor.viewport.value !== 'custom') {
      editor.setViewport('custom');
    }
  }

  function handleViewportSizeChange(payload: IViewportSize) {
    activeViewportWidth.value = payload.width;
    activeViewportHeight.value = payload.height;
  }

  function handlePaletteDragStart(componentName: string) {
    dragDrop.startDragNew(componentName);
  }

  function handlePaletteDragEnd() {
    dragDrop.cancelDrag();
  }

  function handlePaletteAdd(componentName: string) {
    const selectedNodeId = editor.selectedNodeId.value;
    const selectedNode = selectedNodeId !== null ? findNodeById(pb.tree.value, selectedNodeId) : undefined;

    let parentId = pb.contentRoot.value.id;
    let index = pb.contentRoot.value.children.length;
    let slot = 'default';

    if (selectedNodeId !== null && selectedNode) {
      const parentResult = findParent(pb.tree.value, selectedNodeId);
      if (parentResult) {
        parentId = parentResult.parent.id;
        index = parentResult.index + 1;
        slot = selectedNode.slot ?? 'default';
      } else {
        // Selected root node: append into root children.
        parentId = selectedNode.id;
        index = selectedNode.children.length;
      }
    }

    const defaultProps = getComponent(componentName)?.defaultProps;
    const newNodeId = nodeTree.addNode(parentId, componentName, index, slot, defaultProps);
    if (newNodeId !== null) {
      editor.selectNode(newNodeId);
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleEditorKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleEditorKeydown);
  });

  provide(PAGE_BUILDER_KEY, pb);
  provide(EDITOR_KEY, editor);
  provide(NODE_TREE_KEY, nodeTree);
  provide(DRAG_DROP_KEY, dragDrop);
</script>

<template>
  <div class="ipb-page-editor">
    <EditorToolbar
      :can-undo="editor.canUndo.value"
      :can-redo="editor.canRedo.value"
      :is-dirty="pb.isDirty.value"
      :viewport="editor.viewport.value"
      :custom-viewport-width="customViewportWidth"
      :custom-viewport-height="customViewportHeight"
      :active-viewport-width="activeViewportWidth"
      :active-viewport-height="activeViewportHeight"
      @undo="handleUndo"
      @redo="handleRedo"
      @save="handleSave"
      @viewport-change="handleViewportChange"
      @custom-viewport-change="handleCustomViewportChange"
    />

    <div class="ipb-page-editor__body">
      <LeftDrawer
        :open="editor.leftDrawerOpen.value"
        :content="pb.contentRoot.value"
        :selected-node-id="editor.selectedNodeId.value"
        @toggle="editor.toggleLeftDrawer"
        @select="editor.selectNode"
        @add="handlePaletteAdd"
        @drag-start="handlePaletteDragStart"
        @drag-end="handlePaletteDragEnd"
      />

      <IframeCanvas
        :tree="pb.tree.value"
        :variables="pb.variables.value"
        :selected-node-id="editor.selectedNodeId.value"
        :hovered-node-id="editor.hoveredNodeId.value"
        :viewport="editor.viewport.value"
        :viewport-width="editor.viewport.value === 'custom' ? customViewportWidth : null"
        :viewport-height="editor.viewport.value === 'custom' ? customViewportHeight : null"
        @select="editor.selectNode"
        @hover="editor.hoverNode"
        @context-action="handleNodeContextAction"
        @iframe-keydown="handleIframeKeydown"
        @viewport-size-change="handleViewportSizeChange"
      />

      <RightDrawer
        :open="editor.rightDrawerOpen.value"
        :selected-node-id="editor.selectedNodeId.value"
        :content="pb.tree.value"
        @toggle="editor.toggleRightDrawer"
        @update-props="nodeTree.updateNodeProps"
        @delete="handleDeleteNode"
        @duplicate="handleDuplicateNode"
      />
    </div>
  </div>
</template>

<style scoped>
  .ipb-page-editor {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: var(--ipb-editor-bg, #f0f2f5);
  }

  .ipb-page-editor__body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
</style>
