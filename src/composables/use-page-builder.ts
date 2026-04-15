import { ref, computed, type Ref, type ComputedRef } from 'vue';
import type { IPageData, INode } from '@/types/node';
import type { PageBuilderMode } from '@/types/editor';
import { getMaxId, findNodeById } from '@/core/tree';
import {
  createPageBuilderError,
  reportDevDiagnostic,
  toErrorMessage,
} from '@/core/errors';

export interface UsePageBuilderOptions {
  initialData: IPageData;
  mode?: PageBuilderMode;
}

export interface UsePageBuilderReturn {
  mode: Ref<PageBuilderMode>;
  pageData: ComputedRef<IPageData>;
  tree: Ref<INode>;
  contentRoot: ComputedRef<INode>;
  contentRootId: Ref<number>;
  maxId: Ref<number>;
  variables: Ref<Record<string, string>>;
  isDirty: Ref<boolean>;

  setMode: (newMode: PageBuilderMode) => void;
  updateTree: (newTree: INode) => void;
  nextId: () => number;
  getSnapshot: () => string;
  restoreSnapshot: (snapshot: string) => void;
  reset: () => void;
}

interface SnapshotShape {
  tree: INode;
  contentRootId: number;
  maxId: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function createFallbackNode(id: number, name: string, slot: string | null): INode {
  return {
    id,
    name,
    slot,
    props: {},
    children: [],
  };
}

function isNode(value: unknown, visited = new WeakSet<object>()): value is INode {
  if (!isPlainObject(value)) return false;
  if (visited.has(value)) return false;
  visited.add(value);

  if (!isPositiveInteger(value.id)) return false;
  if (typeof value.name !== 'string' || value.name.trim().length === 0) return false;
  if (!(value.slot === null || typeof value.slot === 'string')) return false;
  if (!isPlainObject(value.props)) return false;
  if (!Array.isArray(value.children)) return false;
  if (typeof value.readonly !== 'undefined' && typeof value.readonly !== 'boolean') return false;

  return value.children.every((child) => isNode(child, visited));
}

function sanitizeVariables(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, variableValue] of Object.entries(value)) {
    if (typeof variableValue === 'string') {
      result[key] = variableValue;
    }
  }
  return result;
}

function sanitizeInitialData(initialData: IPageData): IPageData {
  const issues: string[] = [];
  const fallbackTree = createFallbackNode(1, 'PbSection', null);
  const source = isPlainObject(initialData) ? initialData : ({} as Record<string, unknown>);

  let tree = fallbackTree;
  if (isNode(source.tree)) {
    tree = structuredClone(source.tree);
  } else {
    issues.push('tree node is invalid');
  }

  const rawContentRootId = source.contentRootId;
  const hasValidContentRootId = isPositiveInteger(rawContentRootId);
  const contentRootId = hasValidContentRootId ? Math.trunc(rawContentRootId) : tree.id;
  if (!hasValidContentRootId) {
    issues.push('contentRootId is invalid');
  }

  const rawMaxId = source.maxId;
  const computedMaxId = getMaxId(tree);
  const hasValidMaxId = isNonNegativeInteger(rawMaxId);
  const maxId = hasValidMaxId ? Math.max(Math.trunc(rawMaxId), computedMaxId) : computedMaxId;

  if (!hasValidMaxId) {
    issues.push('maxId is invalid');
  }

  const variables = sanitizeVariables(source.variables);
  if (!isPlainObject(source.variables)) {
    issues.push('variables map is invalid');
  }

  const meta = isPlainObject(source.meta) ? source.meta : {};
  if (!isPlainObject(source.meta)) {
    issues.push('meta object is invalid');
  }

  const pageData: IPageData = {
    meta: {
      id: typeof meta.id === 'string' ? meta.id : 'unknown-page',
      name: typeof meta.name === 'string' ? meta.name : 'Untitled page',
      url: typeof meta.url === 'string' ? meta.url : '/',
      status:
        meta.status === 'draft' || meta.status === 'published' || meta.status === 'archived'
          ? meta.status
          : 'draft',
      updatedAt: typeof meta.updatedAt === 'string' ? meta.updatedAt : undefined,
      createdAt: typeof meta.createdAt === 'string' ? meta.createdAt : undefined,
    },
    tree,
    contentRootId,
    maxId,
    variables,
  };

  if (issues.length > 0) {
    reportDevDiagnostic(
      'usePageBuilder.sanitizeInitialData',
      createPageBuilderError(
        'INVALID_PAGE_DATA',
        `[PageBuilder] Invalid page data detected. Falling back to safe defaults for: ${issues.join(', ')}.`,
      ),
      { issues },
    );
  }

  return pageData;
}

function parseSnapshot(snapshot: string): SnapshotShape {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch (error) {
    throw createPageBuilderError(
      'INVALID_SNAPSHOT',
      '[PageBuilder] Snapshot JSON is invalid.',
      {
        cause: error,
        details: {
          snapshotPreview: snapshot.slice(0, 200),
        },
      },
    );
  }

  if (!isPlainObject(parsed) || !isNode(parsed.tree) || !isPositiveInteger(parsed.contentRootId) || !isNonNegativeInteger(parsed.maxId)) {
    throw createPageBuilderError(
      'INVALID_SNAPSHOT',
      '[PageBuilder] Snapshot payload shape is invalid.',
      {
        details: {
          treeValid: isPlainObject(parsed) ? isNode(parsed.tree) : false,
          contentRootIdValid: isPlainObject(parsed) ? isPositiveInteger(parsed.contentRootId) : false,
          maxIdValid: isPlainObject(parsed) ? isNonNegativeInteger(parsed.maxId) : false,
        },
      },
    );
  }

  const normalizedMaxId = Math.max(
    Math.trunc(parsed.maxId),
    getMaxId(parsed.tree),
  );

  return {
    tree: parsed.tree,
    contentRootId: parsed.contentRootId as number,
    maxId: normalizedMaxId,
  };
}

/**
 * Main composable for managing page builder state.
 * Used internally by the PageBuilder component.
 */
export function usePageBuilder(options: UsePageBuilderOptions): UsePageBuilderReturn {
  const { initialData, mode: initialMode = 'read' } = options;

  const _initial = sanitizeInitialData(initialData);
  const mode = ref<PageBuilderMode>(initialMode);
  const meta = ref(_initial.meta);
  const tree = ref<INode>(_initial.tree);
  const contentRootId = ref(_initial.contentRootId);
  const maxId = ref(_initial.maxId);
  const variables = ref<Record<string, string>>(_initial.variables);
  const isDirty = ref(false);

  const contentRoot = computed<INode>(() => {
    return findNodeById(tree.value, contentRootId.value) ?? tree.value;
  });

  const pageData = computed<IPageData>(() => ({
    meta: meta.value,
    tree: tree.value,
    contentRootId: contentRootId.value,
    maxId: maxId.value,
    variables: variables.value,
  }));

  const _initialDirtySnapshot = JSON.stringify(tree.value);

  function _syncDirtyFromCurrentState() {
    isDirty.value = JSON.stringify(tree.value) !== _initialDirtySnapshot;
  }

  function setMode(newMode: PageBuilderMode) {
    mode.value = newMode;
  }

  function updateTree(newTree: INode) {
    tree.value = newTree;
    maxId.value = Math.max(maxId.value, getMaxId(newTree));
    _syncDirtyFromCurrentState();
  }

  function nextId(): number {
    maxId.value++;
    return maxId.value;
  }

  function getSnapshot(): string {
    return JSON.stringify({
      tree: tree.value,
      contentRootId: contentRootId.value,
      maxId: maxId.value,
    });
  }

  function restoreSnapshot(snapshot: string) {
    try {
      const parsed = parseSnapshot(snapshot);
      tree.value = parsed.tree;
      contentRootId.value = parsed.contentRootId;
      maxId.value = parsed.maxId;
      _syncDirtyFromCurrentState();
    } catch (error) {
      throw createPageBuilderError(
        'INVALID_SNAPSHOT',
        '[PageBuilder] Unable to restore snapshot.',
        {
          cause: error,
          details: {
            reason: toErrorMessage(error),
          },
        },
      );
    }
  }

  function reset() {
    tree.value = structuredClone(_initial.tree);
    contentRootId.value = _initial.contentRootId;
    maxId.value = _initial.maxId;
    variables.value = structuredClone(_initial.variables);
    isDirty.value = false;
  }

  return {
    mode,
    pageData,
    tree,
    contentRoot,
    contentRootId,
    maxId,
    variables,
    isDirty,
    setMode,
    updateTree,
    nextId,
    getSnapshot,
    restoreSnapshot,
    reset,
  };
}
