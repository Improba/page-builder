import { ref, type Ref } from 'vue';

export interface DragState {
  isDragging: boolean;
  sourceNodeId: number | null;
  sourceComponentName: string | null;
  isNewComponent: boolean;
  dropTargetId: number | null;
  dropIndex: number;
  dropSlot: string;
}

export interface DragDropApi {
  dragState: Ref<DragState>;
  startDragExisting: (nodeId: number) => void;
  startDragNew: (componentName: string) => void;
  updateDropTarget: (targetId: number, index: number, slot?: string) => void;
  endDrag: () => DragState;
  cancelDrag: () => void;
}

const DEFAULT_DROP_SLOT = 'default';

function createInitialDragState(): DragState {
  return {
    isDragging: false,
    sourceNodeId: null,
    sourceComponentName: null,
    isNewComponent: false,
    dropTargetId: null,
    dropIndex: 0,
    dropSlot: DEFAULT_DROP_SLOT,
  };
}

/**
 * Composable for drag-and-drop interactions in the editor.
 * Handles both dragging existing nodes and new components from the palette.
 */
export function useDragDrop(): DragDropApi {
  const state = ref<DragState>(createInitialDragState());

  function resetDragState() {
    state.value = createInitialDragState();
  }

  function startDragExisting(nodeId: number) {
    state.value = {
      ...createInitialDragState(),
      isDragging: true,
      sourceNodeId: nodeId,
    };
  }

  function startDragNew(componentName: string) {
    state.value = {
      ...createInitialDragState(),
      isDragging: true,
      sourceComponentName: componentName,
      isNewComponent: true,
    };
  }

  function updateDropTarget(targetId: number, index: number, slot = DEFAULT_DROP_SLOT) {
    if (!state.value.isDragging) return;
    state.value.dropTargetId = targetId;
    state.value.dropIndex = index;
    state.value.dropSlot = slot;
  }

  function endDrag() {
    const result = { ...state.value };
    resetDragState();
    return result;
  }

  function cancelDrag() {
    resetDragState();
  }

  return {
    dragState: state,
    startDragExisting,
    startDragNew,
    updateDropTarget,
    endDrag,
    cancelDrag,
  };
}
