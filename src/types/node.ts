/**
 * Core tree node representing a single component instance in the page tree.
 *
 * The page structure is a recursive tree of INode objects.
 * Each node maps to a registered component and can contain children
 * distributed across named slots.
 */
export interface INode {
  /** Unique identifier within the tree. Used for selection, drag-drop, and reconciliation. */
  id: number;

  /** Component name — must match a key in the component registry. */
  name: string;

  /** Target slot name in the parent component. `null` for the root node. */
  slot: string | null;

  /** Props passed to the component instance. Supports template variables via `{{ VAR }}`. */
  props: Record<string, unknown>;

  /** Child nodes, rendered into the component's slots. */
  children: INode[];

  /** If true, this node cannot be edited, moved, or deleted in edit mode. */
  readonly?: boolean;
}

/**
 * Full page data structure.
 * This is the single JSON payload the frontend receives.
 */
export interface IPageData {
  /** Page metadata */
  meta: IPageMeta;

  /** Single tree containing layout and page content. */
  tree: INode;

  /** Node id within `tree` that is the root of the page content subtree. */
  contentRootId: number;

  /** Maximum node ID used in the tree. Incremented when adding new nodes. */
  maxId: number;

  /** Variables injected into component props via `{{ VAR }}` syntax. */
  variables: Record<string, string>;
}

export interface IPageMeta {
  id: string;
  name: string;
  url: string;
  status: 'draft' | 'published' | 'archived';
  updatedAt?: string;
  createdAt?: string;
}

/**
 * Serialized page data sent back to the backend on save.
 * Only the mutable parts are included.
 */
export interface IPageSavePayload {
  content: INode;
  maxId: number;
}
