import { reactive, computed, toRefs } from 'vue';
import type { ViewportPreset } from '@/types/editor';

interface UseEditorOptions {
  initialSnapshot?: string;
  initialLabel?: string;
}

interface EditorUIState {
  selectedNodeId: number | null;
  hoveredNodeId: number | null;
  leftDrawerOpen: boolean;
  rightDrawerOpen: boolean;
  history: { timestamp: number; label: string; snapshot: string }[];
  historyIndex: number;
  isDirty: boolean;
  canvasScale: number;
  viewport: ViewportPreset;
}

/**
 * Composable managing the editor UI state (selection, drawers, history, viewport).
 * Drag-and-drop state is handled separately by useDragDrop.
 */
export function useEditor(options: UseEditorOptions = {}) {
  const { initialSnapshot, initialLabel = 'Initial state' } = options;
  const initialHistory = initialSnapshot
    ? [{ timestamp: Date.now(), label: initialLabel, snapshot: initialSnapshot }]
    : [];
  let baselineSnapshot: string | null = initialSnapshot ?? null;

  const state = reactive<EditorUIState>({
    selectedNodeId: null,
    hoveredNodeId: null,
    leftDrawerOpen: true,
    rightDrawerOpen: false,
    history: initialHistory,
    historyIndex: initialHistory.length > 0 ? 0 : -1,
    isDirty: false,
    canvasScale: 1,
    viewport: 'desktop',
  });

  const canUndo = computed(() => state.historyIndex > 0);
  const canRedo = computed(() => state.historyIndex < state.history.length - 1);

  function selectNode(id: number | null) {
    state.selectedNodeId = id;
    if (id !== null) {
      state.rightDrawerOpen = true;
    }
  }

  function hoverNode(id: number | null) {
    state.hoveredNodeId = id;
  }

  function toggleLeftDrawer() {
    state.leftDrawerOpen = !state.leftDrawerOpen;
  }

  function toggleRightDrawer() {
    state.rightDrawerOpen = !state.rightDrawerOpen;
  }

  function setViewport(preset: ViewportPreset) {
    state.viewport = preset;
  }

  function syncDirtyWithHistory() {
    if (baselineSnapshot === null || state.historyIndex < 0) {
      state.isDirty = false;
      return;
    }
    const currentSnapshot = state.history[state.historyIndex]?.snapshot;
    state.isDirty = currentSnapshot !== baselineSnapshot;
  }

  function setHistoryBaseline(snapshot: string, label = initialLabel) {
    baselineSnapshot = snapshot;
    state.history = [{ timestamp: Date.now(), label, snapshot }];
    state.historyIndex = 0;
    state.isDirty = false;
  }

  function pushHistory(label: string, snapshot: string) {
    if (baselineSnapshot === null) {
      setHistoryBaseline(snapshot);
      return;
    }

    const currentSnapshot = state.history[state.historyIndex]?.snapshot;
    if (currentSnapshot === snapshot) return;

    if (state.historyIndex < state.history.length - 1) {
      state.history.splice(state.historyIndex + 1);
    }
    state.history.push({
      timestamp: Date.now(),
      label,
      snapshot,
    });
    state.historyIndex = state.history.length - 1;
    syncDirtyWithHistory();
  }

  function undo(): string | undefined {
    if (!canUndo.value) return undefined;
    state.historyIndex--;
    syncDirtyWithHistory();
    return state.history[state.historyIndex]?.snapshot;
  }

  function redo(): string | undefined {
    if (!canRedo.value) return undefined;
    state.historyIndex++;
    syncDirtyWithHistory();
    return state.history[state.historyIndex]?.snapshot;
  }

  return {
    ...toRefs(state),
    canUndo,
    canRedo,
    selectNode,
    hoverNode,
    toggleLeftDrawer,
    toggleRightDrawer,
    setViewport,
    setHistoryBaseline,
    pushHistory,
    undo,
    redo,
  };
}
