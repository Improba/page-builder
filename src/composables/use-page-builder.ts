import { ref, computed, type Ref, type ComputedRef } from 'vue';
import type { IPageData, INode } from '@/types/node';
import type { PageBuilderMode } from '@/types/editor';
import { getMaxId } from '@/core/tree';
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
  content: Ref<INode>;
  layout: Ref<INode>;
  maxId: Ref<number>;
  variables: Ref<Record<string, string>>;
  isDirty: Ref<boolean>;

  setMode: (newMode: PageBuilderMode) => void;
  updateContent: (newContent: INode) => void;
  updateLayout: (newLayout: INode) => void;
  nextId: () => number;
  getSnapshot: () => string;
  restoreSnapshot: (snapshot: string) => void;
  reset: () => void;
}

interface SnapshotShape {
  content: INode;
  layout: INode;
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
  const fallbackContent = createFallbackNode(1, 'PbSection', null);
  const fallbackLayout = createFallbackNode(100, 'PbContainer', null);
  const source = isPlainObject(initialData) ? initialData : ({} as Record<string, unknown>);

  let content = fallbackContent;
  if (isNode(source.content)) {
    content = structuredClone(source.content);
  } else {
    issues.push('content node is invalid');
  }

  let layout = fallbackLayout;
  if (isNode(source.layout)) {
    layout = structuredClone(source.layout);
  } else {
    issues.push('layout node is invalid');
  }

  const rawMaxId = source.maxId;
  const computedMaxId = Math.max(getMaxId(content), getMaxId(layout));
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
    content,
    layout,
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

  if (!isPlainObject(parsed) || !isNode(parsed.content) || !isNode(parsed.layout) || !isNonNegativeInteger(parsed.maxId)) {
    throw createPageBuilderError(
      'INVALID_SNAPSHOT',
      '[PageBuilder] Snapshot payload shape is invalid.',
      {
        details: {
          contentValid: isPlainObject(parsed) ? isNode(parsed.content) : false,
          layoutValid: isPlainObject(parsed) ? isNode(parsed.layout) : false,
          maxIdValid: isPlainObject(parsed) ? isNonNegativeInteger(parsed.maxId) : false,
        },
      },
    );
  }

  const normalizedMaxId = Math.max(
    Math.trunc(parsed.maxId),
    getMaxId(parsed.content),
    getMaxId(parsed.layout),
  );

  return {
    content: parsed.content,
    layout: parsed.layout,
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
  const content = ref<INode>(_initial.content);
  const layout = ref<INode>(_initial.layout);
  const maxId = ref(_initial.maxId);
  const variables = ref<Record<string, string>>(_initial.variables);
  const isDirty = ref(false);

  const pageData = computed<IPageData>(() => ({
    meta: meta.value,
    content: content.value,
    layout: layout.value,
    maxId: maxId.value,
    variables: variables.value,
  }));

  const _initialDirtySnapshot = _serializeDirtyState({
    content: _initial.content,
    layout: _initial.layout,
  });

  function _serializeSnapshot(snapshot: Pick<IPageData, 'content' | 'layout' | 'maxId'>): string {
    return JSON.stringify(snapshot);
  }

  function _serializeDirtyState(state: Pick<IPageData, 'content' | 'layout'>): string {
    return JSON.stringify(state);
  }

  function _syncDirtyFromCurrentState() {
    isDirty.value = _serializeDirtyState({
      content: content.value,
      layout: layout.value,
    }) !== _initialDirtySnapshot;
  }

  function setMode(newMode: PageBuilderMode) {
    mode.value = newMode;
  }

  function updateContent(newContent: INode) {
    content.value = newContent;
    maxId.value = Math.max(maxId.value, getMaxId(newContent));
    _syncDirtyFromCurrentState();
  }

  function updateLayout(newLayout: INode) {
    layout.value = newLayout;
    maxId.value = Math.max(maxId.value, getMaxId(newLayout));
    _syncDirtyFromCurrentState();
  }

  function nextId(): number {
    maxId.value++;
    return maxId.value;
  }

  function getSnapshot(): string {
    return _serializeSnapshot({
      content: content.value,
      layout: layout.value,
      maxId: maxId.value,
    });
  }

  function restoreSnapshot(snapshot: string) {
    try {
      const parsed = parseSnapshot(snapshot);
      content.value = parsed.content;
      layout.value = parsed.layout;
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
    const original = parseSnapshot(
      JSON.stringify({
        content: _initial.content,
        layout: _initial.layout,
        maxId: _initial.maxId,
      }),
    );
    content.value = structuredClone(original.content);
    layout.value = structuredClone(original.layout);
    maxId.value = original.maxId;
    variables.value = structuredClone(_initial.variables);
    isDirty.value = false;
  }

  return {
    mode,
    pageData,
    content,
    layout,
    maxId,
    variables,
    isDirty,
    setMode,
    updateContent,
    updateLayout,
    nextId,
    getSnapshot,
    restoreSnapshot,
    reset,
  };
}
