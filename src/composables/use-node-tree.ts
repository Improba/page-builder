import type { Ref } from 'vue';
import { toRaw } from 'vue';
import type { INode } from '@/types/node';
import {
  cloneTree,
  findNodeById,
  findParent,
  removeNode,
  insertNode,
  moveNode,
  createNode,
} from '@/core/tree';

export interface UseNodeTreeOptions {
  content: Ref<INode>;
  nextId: () => number;
  onUpdate: (newContent: INode) => void;
  onSnapshot?: (label: string) => void;
}

/**
 * Composable for manipulating the node tree (add, remove, move, update props).
 * All mutations clone before modifying to preserve immutability for history.
 */
export function useNodeTree({ content, nextId, onUpdate, onSnapshot }: UseNodeTreeOptions) {
  function _mutate(label: string, mutator: (tree: INode) => boolean | void): boolean {
    // `content.value` may be a Vue proxy; clone the raw node tree.
    const currentTree = toRaw(content.value);
    const currentSnapshot = JSON.stringify(currentTree);
    const cloned = cloneTree(currentTree);
    const shouldCommit = mutator(cloned);
    if (shouldCommit === false) return false;
    if (JSON.stringify(cloned) === currentSnapshot) return false;
    onUpdate(cloned);
    onSnapshot?.(label);
    return true;
  }

  function addNode(
    parentId: number,
    componentName: string,
    index: number,
    slot = 'default',
    defaultProps?: Record<string, unknown>,
  ): number | null {
    let createdNodeId: number | null = null;
    const didInsert = _mutate(`Add ${componentName}`, (tree) => {
      const parentNode = findNodeById(tree, parentId);
      if (!parentNode) return false;

      createdNodeId = nextId();
      const node = createNode(createdNodeId, componentName, { slot, props: defaultProps });
      return insertNode(tree, parentId, node, index, slot);
    });

    if (!didInsert || createdNodeId === null) return null;
    return createdNodeId;
  }

  function deleteNode(nodeId: number) {
    _mutate('Delete node', (tree) => {
      removeNode(tree, nodeId);
    });
  }

  function moveNodeTo(nodeId: number, newParentId: number, index: number, slot = 'default') {
    _mutate('Move node', (tree) => {
      return moveNode(tree, nodeId, newParentId, index, slot);
    });
  }

  function updateNodeProps(nodeId: number, props: Record<string, unknown>) {
    _mutate('Update props', (tree) => {
      const node = findNodeById(tree, nodeId);
      if (node) {
        node.props = { ...node.props, ...props };
      }
    });
  }

  function duplicateNode(nodeId: number) {
    _mutate('Duplicate node', (tree) => {
      const original = findNodeById(tree, nodeId);
      if (!original) return;

      const parentResult = findParent(tree, nodeId);
      if (!parentResult) return;

      const cloned = _deepCloneWithNewIds(original);
      parentResult.parent.children.splice(parentResult.index + 1, 0, cloned);
    });
  }

  function canMoveNodeUp(nodeId: number): boolean {
    const node = findNodeById(content.value, nodeId);
    if (!node || node.readonly) return false;
    const parentResult = findParent(content.value, nodeId);
    if (!parentResult) return false;
    return parentResult.index > 0;
  }

  function canMoveNodeDown(nodeId: number): boolean {
    const node = findNodeById(content.value, nodeId);
    if (!node || node.readonly) return false;
    const parentResult = findParent(content.value, nodeId);
    if (!parentResult) return false;
    return parentResult.index < parentResult.parent.children.length - 1;
  }

  function moveNodeUp(nodeId: number) {
    if (!canMoveNodeUp(nodeId)) return;
    _mutate('Move node up', (tree) => {
      const parentResult = findParent(tree, nodeId);
      if (!parentResult || parentResult.index <= 0) return;
      const [node] = parentResult.parent.children.splice(parentResult.index, 1);
      parentResult.parent.children.splice(parentResult.index - 1, 0, node);
    });
  }

  function moveNodeDown(nodeId: number) {
    if (!canMoveNodeDown(nodeId)) return;
    _mutate('Move node down', (tree) => {
      const parentResult = findParent(tree, nodeId);
      if (!parentResult || parentResult.index >= parentResult.parent.children.length - 1) return;
      const [node] = parentResult.parent.children.splice(parentResult.index, 1);
      parentResult.parent.children.splice(parentResult.index + 1, 0, node);
    });
  }

  function _deepCloneWithNewIds(node: INode): INode {
    return {
      ...node,
      id: nextId(),
      props: { ...node.props },
      children: node.children.map((child) => _deepCloneWithNewIds(child)),
    };
  }

  return {
    addNode,
    deleteNode,
    moveNodeTo,
    updateNodeProps,
    duplicateNode,
    canMoveNodeUp,
    canMoveNodeDown,
    moveNodeUp,
    moveNodeDown,
  };
}
