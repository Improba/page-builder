import type { INode } from '@/types/node';

export interface IVirtualTreeRow {
  node: INode;
  id: number;
  key: string;
  depth: number;
  index: number;
  parentId: number | null;
}

export interface IVirtualWindowRange {
  start: number;
  end: number;
  size: number;
  total: number;
}

export interface IVirtualTreeIndexMaps {
  keyByIndex: string[];
  indexByKey: Map<string, number>;
  indexByNodeId: Map<number, number>;
}

export interface IFlattenTreeOptions {
  createKey?: (node: INode) => string;
}

function toSafeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

export function createStableNodeKey(nodeId: number): string {
  return `ipb-node-${nodeId}`;
}

/**
 * Flatten a node tree in depth-first pre-order with depth metadata.
 * Uses an iterative stack to avoid recursion depth issues on large trees.
 */
export function flattenTree(root: INode, options: IFlattenTreeOptions = {}): IVirtualTreeRow[] {
  const createKey = options.createKey ?? ((node: INode) => createStableNodeKey(node.id));
  const rows: IVirtualTreeRow[] = [];
  const stack: Array<{ node: INode; depth: number; parentId: number | null }> = [
    { node: root, depth: 0, parentId: null },
  ];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;

    const index = rows.length;
    rows.push({
      node: current.node,
      id: current.node.id,
      key: createKey(current.node),
      depth: current.depth,
      index,
      parentId: current.parentId,
    });

    for (let i = current.node.children.length - 1; i >= 0; i--) {
      stack.push({
        node: current.node.children[i],
        depth: current.depth + 1,
        parentId: current.node.id,
      });
    }
  }

  return rows;
}

/**
 * Compute a clamped window range over a flat list.
 */
export function computeWindowRange(
  total: number,
  startIndex: number,
  windowSize: number,
  overscan = 0,
): IVirtualWindowRange {
  const safeTotal = Math.max(0, toSafeInteger(total));
  const safeWindowSize = Math.max(0, toSafeInteger(windowSize));
  const safeOverscan = Math.max(0, toSafeInteger(overscan));

  if (safeTotal === 0 || safeWindowSize === 0) {
    return { start: 0, end: 0, size: 0, total: safeTotal };
  }

  const maxStart = safeTotal - 1;
  const safeStartIndex = Math.min(Math.max(toSafeInteger(startIndex), 0), maxStart);
  const start = Math.max(0, safeStartIndex - safeOverscan);
  const end = Math.min(safeTotal, safeStartIndex + safeWindowSize + safeOverscan);

  return {
    start,
    end,
    size: Math.max(0, end - start),
    total: safeTotal,
  };
}

/**
 * Slice a list using a computed virtual window.
 */
export function sliceWindow<T>(
  rows: readonly T[],
  startIndex: number,
  windowSize: number,
  overscan = 0,
): { rows: T[]; range: IVirtualWindowRange } {
  const range = computeWindowRange(rows.length, startIndex, windowSize, overscan);
  return {
    rows: rows.slice(range.start, range.end),
    range,
  };
}

/**
 * Build stable key/index lookup maps from flattened tree rows.
 */
export function createVirtualTreeIndexMaps(rows: readonly IVirtualTreeRow[]): IVirtualTreeIndexMaps {
  const keyByIndex: string[] = [];
  const indexByKey = new Map<string, number>();
  const indexByNodeId = new Map<number, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    keyByIndex[i] = row.key;

    if (!indexByKey.has(row.key)) {
      indexByKey.set(row.key, i);
    }

    if (!indexByNodeId.has(row.id)) {
      indexByNodeId.set(row.id, i);
    }
  }

  return {
    keyByIndex,
    indexByKey,
    indexByNodeId,
  };
}
