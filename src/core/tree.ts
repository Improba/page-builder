import type { INode } from '@/types/node';
import { createPageBuilderError } from '@/core/errors';

function getChildren(node: INode): INode[] {
  return Array.isArray(node.children) ? node.children : [];
}

function clampIndex(index: number, length: number): number {
  const normalized = Number.isFinite(index) ? Math.trunc(index) : 0;
  return Math.max(0, Math.min(normalized, length));
}

/**
 * Deep clone a node tree using structured clone.
 */
export function cloneTree(node: INode): INode {
  try {
    return structuredClone(node);
  } catch (error) {
    throw createPageBuilderError(
      'INVALID_NODE',
      '[PageBuilder] Failed to clone node tree. Ensure the tree is serializable and acyclic.',
      {
        cause: error,
      },
    );
  }
}

/**
 * Find a node by ID in the tree. Returns undefined if not found.
 */
export function findNodeById(root: INode, id: number): INode | undefined {
  if (root.id === id) return root;
  for (const child of getChildren(root)) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Find the parent of a node by the child's ID.
 * Returns the parent node and the child's index, or undefined.
 */
export function findParent(
  root: INode,
  childId: number,
): { parent: INode; index: number } | undefined {
  const children = getChildren(root);
  for (let i = 0; i < children.length; i++) {
    if (children[i].id === childId) {
      return { parent: root, index: i };
    }
    const found = findParent(children[i], childId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Remove a node by ID from the tree. Returns the removed node or undefined.
 */
export function removeNode(root: INode, id: number): INode | undefined {
  const result = findParent(root, id);
  if (!result) return undefined;
  return result.parent.children.splice(result.index, 1)[0];
}

/**
 * Insert a node as a child of a target node at a specific index and slot.
 */
export function insertNode(
  root: INode,
  parentId: number,
  node: INode,
  index: number,
  slot: string = 'default',
): boolean {
  const parent = findNodeById(root, parentId);
  if (!parent) return false;
  if (!Array.isArray(parent.children)) {
    parent.children = [];
  }

  const targetIndex = clampIndex(index, parent.children.length);
  const insertedNode = { ...node, slot };
  parent.children.splice(targetIndex, 0, insertedNode);
  return true;
}

/**
 * Move a node within the tree to a new parent at a specific index.
 */
export function moveNode(
  root: INode,
  nodeId: number,
  newParentId: number,
  index: number,
  slot: string = 'default',
): boolean {
  const sourceParentResult = findParent(root, nodeId);
  if (!sourceParentResult) return false;

  const sourceChildren = getChildren(sourceParentResult.parent);
  const [node] = sourceChildren.splice(sourceParentResult.index, 1);
  if (!node) return false;

  const moved = insertNode(root, newParentId, node, index, slot);
  if (moved) return true;

  // Roll back on failure so the caller never loses nodes due to invalid moves.
  const rollbackIndex = clampIndex(sourceParentResult.index, sourceChildren.length);
  sourceChildren.splice(rollbackIndex, 0, node);
  return false;
}

/**
 * Create a new node with default values and a given ID.
 */
export function createNode(
  id: number,
  name: string,
  options: Partial<Pick<INode, 'slot' | 'props' | 'children' | 'readonly'>> = {},
): INode {
  return {
    id,
    name,
    slot: options.slot ?? 'default',
    props: options.props ?? {},
    children: options.children ?? [],
    readonly: options.readonly,
  };
}

/**
 * Walk the tree depth-first and call visitor for each node.
 * Return `false` from visitor to stop the entire traversal (not just the subtree).
 */
export function walkTree(root: INode, visitor: (node: INode, depth: number) => boolean | void, depth = 0): boolean {
  const visited = new WeakSet<object>();

  function visitNode(node: INode, currentDepth: number): boolean {
    if (visited.has(node as object)) return true;
    visited.add(node as object);

    if (visitor(node, currentDepth) === false) return false;
    for (const child of getChildren(node)) {
      if (visitNode(child, currentDepth + 1) === false) return false;
    }
    return true;
  }

  return visitNode(root, depth);
}

/**
 * Count the total number of nodes in the tree.
 */
export function countNodes(root: INode): number {
  let count = 0;
  walkTree(root, () => { count++; });
  return count;
}

/**
 * Get the maximum ID in the tree.
 */
export function getMaxId(root: INode): number {
  let max = root.id;
  walkTree(root, (node) => {
    if (Number.isFinite(node.id) && node.id > max) max = node.id;
  });
  return max;
}

/**
 * Interpolate template variables in node props.
 * Replaces `{{ VAR }}` patterns with values from the variables map.
 */
export function interpolateProps(
  props: Record<string, unknown>,
  variables: Record<string, string>,
): Record<string, unknown> {
  if (!props || typeof props !== 'object' || Array.isArray(props)) {
    return {};
  }

  const safeVariables =
    variables && typeof variables === 'object' && !Array.isArray(variables) ? variables : {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string') {
      result[key] = value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, varName: string) => {
        return safeVariables[varName] ?? `{{ ${varName} }}`;
      });
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Extract plain text from a node tree by collecting text content
 * from PbText (and similar) components and stripping HTML tags.
 */
export function extractPlainText(node: INode): string {
  const texts: string[] = [];
  walkTree(node, (n) => {
    if (n.props.content && typeof n.props.content === 'string') {
      const stripped = n.props.content.replace(/<[^>]*>/g, '');
      if (stripped.trim()) texts.push(stripped.trim());
    }
  });
  return texts.join(' ').replace(/\s+/g, ' ').trim();
}
