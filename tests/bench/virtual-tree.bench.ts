import { bench, describe } from 'vitest';
import { createVirtualTreeIndexMaps, flattenTree, sliceWindow } from '@/core/virtual-tree';
import { createDeterministicTreeFixture } from './helpers/tree-fixtures';

const LARGE_TREE = createDeterministicTreeFixture(7, 4);
const FLAT_ROWS = flattenTree(LARGE_TREE.root);
const WINDOW_SIZE = 180;
const WINDOW_OVERSCAN = 40;
let virtualStartIndex = 0;

describe('Virtual tree benchmarks', () => {
  bench('flattenTree on 20k+ node tree', () => {
    const rows = flattenTree(LARGE_TREE.root);
    if (rows.length !== LARGE_TREE.nodeCount) {
      throw new Error(`Unexpected flattened row count: ${rows.length}`);
    }
  });

  bench('sliceWindow during deterministic scroll progression', () => {
    const result = sliceWindow(FLAT_ROWS, virtualStartIndex, WINDOW_SIZE, WINDOW_OVERSCAN);
    if (result.rows.length === 0) {
      throw new Error('Window unexpectedly empty');
    }

    virtualStartIndex = (virtualStartIndex + 137) % FLAT_ROWS.length;
  });

  bench('createVirtualTreeIndexMaps from flattened rows', () => {
    const maps = createVirtualTreeIndexMaps(FLAT_ROWS);
    if (maps.keyByIndex.length !== FLAT_ROWS.length) {
      throw new Error('Index map length mismatch');
    }
  });
});
