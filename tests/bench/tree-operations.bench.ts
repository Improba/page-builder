import { bench, describe } from 'vitest';
import { cloneTree, countNodes, findNodeById, findParent, getMaxId, moveNode } from '@/core/tree';
import { createDeterministicTreeFixture } from './helpers/tree-fixtures';

const LARGE_TREE = createDeterministicTreeFixture(7, 4);
const MOVE_TREE = cloneTree(LARGE_TREE.root);
const MOVE_SOURCE_ID = LARGE_TREE.deepestLeafId;
const MOVE_SOURCE_PARENT = findParent(MOVE_TREE, MOVE_SOURCE_ID);
const MOVE_SOURCE_PARENT_ID = MOVE_SOURCE_PARENT?.parent.id ?? MOVE_TREE.id;
const MOVE_TARGET_PARENT_ID =
  MOVE_SOURCE_PARENT_ID === LARGE_TREE.primaryBranchId
    ? LARGE_TREE.secondaryBranchId
    : LARGE_TREE.primaryBranchId;

describe('Core tree benchmarks', () => {
  bench('countNodes over large tree', () => {
    const count = countNodes(LARGE_TREE.root);
    if (count !== LARGE_TREE.nodeCount) {
      throw new Error(`Unexpected node count: ${count}`);
    }
  });

  bench('getMaxId over large tree', () => {
    const maxId = getMaxId(LARGE_TREE.root);
    if (maxId !== LARGE_TREE.maxId) {
      throw new Error(`Unexpected max id: ${maxId}`);
    }
  });

  bench('findNodeById for deepest existing node', () => {
    const node = findNodeById(LARGE_TREE.root, LARGE_TREE.deepestLeafId);
    if (!node) {
      throw new Error('Deepest node not found');
    }
  });

  bench('findNodeById for missing node', () => {
    const node = findNodeById(LARGE_TREE.root, LARGE_TREE.maxId + 1);
    if (node) {
      throw new Error('Unexpectedly found missing node');
    }
  });

  bench('moveNode round-trip between branches', () => {
    const movedToTarget = moveNode(MOVE_TREE, MOVE_SOURCE_ID, MOVE_TARGET_PARENT_ID, 0);
    if (!movedToTarget) {
      throw new Error('Failed to move node to target branch');
    }

    const movedBack = moveNode(MOVE_TREE, MOVE_SOURCE_ID, MOVE_SOURCE_PARENT_ID, Number.MAX_SAFE_INTEGER);
    if (!movedBack) {
      throw new Error('Failed to move node back to source branch');
    }
  });
});
