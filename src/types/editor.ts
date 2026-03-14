import type { INode, IPageSavePayload } from './node';

/** Operating mode for the page builder. */
export type PageBuilderMode = 'read' | 'edit';

/**
 * Editor UI state managed by the useEditor composable.
 * Drag-and-drop state is managed separately by useDragDrop.
 */
export interface IEditorState {
  /** Currently selected node, or null. */
  selectedNodeId: number | null;

  /** Currently hovered node, or null. */
  hoveredNodeId: number | null;

  /** Whether the left drawer (component palette) is open. */
  leftDrawerOpen: boolean;

  /** Whether the right drawer (property editor) is open. */
  rightDrawerOpen: boolean;

  /** Undo/redo history stack. */
  history: IEditorHistoryEntry[];

  /** Current position in the history stack. */
  historyIndex: number;

  /** Dirty flag — true if unsaved changes exist. */
  isDirty: boolean;

  /** Viewport scale for the canvas iframe. */
  canvasScale: number;

  /** Viewport preset. */
  viewport: ViewportPreset;
}

export interface IEditorHistoryEntry {
  timestamp: number;
  label: string;
  snapshot: string;
}

export type ViewportPreset = 'desktop' | 'tablet' | 'mobile' | 'custom';

export interface IViewportDimensions {
  width: number;
  height: number;
  label: string;
}

export interface IViewportSize {
  width: number;
  height: number;
}

export const VIEWPORT_PRESETS: Record<ViewportPreset, IViewportDimensions> = {
  desktop: { width: 1440, height: 900, label: 'Desktop' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  mobile: { width: 375, height: 812, label: 'Mobile' },
  custom: { width: 0, height: 0, label: 'Custom' },
};

/**
 * Events emitted by the page builder in edit mode.
 */
export interface IPageBuilderEvents {
  /** Emitted when the user saves (Ctrl+S or save button). */
  save: [payload: IPageSavePayload];

  /** Emitted when the tree structure changes. */
  change: [tree: INode];

  /** Emitted when a node is selected. */
  select: [nodeId: number | null];
}
