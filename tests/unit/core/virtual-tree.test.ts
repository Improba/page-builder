import type { INode } from '@/types/node';
import {
  computeWindowRange,
  createStableNodeKey,
  createVirtualTreeIndexMaps,
  flattenTree,
  sliceWindow,
} from '@/core/virtual-tree';

function makeTree(): INode {
  return {
    id: 10,
    name: 'Root',
    slot: null,
    props: {},
    children: [
      {
        id: 11,
        name: 'Section',
        slot: 'default',
        props: {},
        children: [
          {
            id: 12,
            name: 'Text',
            slot: 'default',
            props: {},
            children: [],
          },
        ],
      },
      {
        id: 13,
        name: 'Button',
        slot: 'default',
        props: {},
        children: [],
      },
    ],
  };
}

describe('Virtual tree helpers', () => {
  describe('createStableNodeKey', () => {
    it('creates deterministic node keys from IDs', () => {
      expect(createStableNodeKey(42)).toBe('ipb-node-42');
      expect(createStableNodeKey(42)).toBe('ipb-node-42');
    });
  });

  describe('flattenTree', () => {
    it('flattens the tree in depth-first pre-order with metadata', () => {
      const rows = flattenTree(makeTree());

      expect(rows.map((row) => row.id)).toEqual([10, 11, 12, 13]);
      expect(rows.map((row) => row.depth)).toEqual([0, 1, 2, 1]);
      expect(rows.map((row) => row.parentId)).toEqual([null, 10, 11, 10]);
      expect(rows.map((row) => row.index)).toEqual([0, 1, 2, 3]);
      expect(rows.map((row) => row.key)).toEqual(['ipb-node-10', 'ipb-node-11', 'ipb-node-12', 'ipb-node-13']);
    });

    it('supports custom key generation', () => {
      const rows = flattenTree(makeTree(), {
        createKey: (node) => `node:${node.id}`,
      });

      expect(rows.map((row) => row.key)).toEqual(['node:10', 'node:11', 'node:12', 'node:13']);
    });
  });

  describe('computeWindowRange', () => {
    it('computes a clamped range with overscan', () => {
      expect(computeWindowRange(100, 10, 5, 2)).toEqual({
        start: 8,
        end: 17,
        size: 9,
        total: 100,
      });
    });

    it('clamps out-of-bounds indexes and negative values', () => {
      expect(computeWindowRange(4, -100, 2, -2)).toEqual({
        start: 0,
        end: 2,
        size: 2,
        total: 4,
      });
      expect(computeWindowRange(4, 999, 2, 1)).toEqual({
        start: 2,
        end: 4,
        size: 2,
        total: 4,
      });
    });

    it('returns an empty range for empty datasets or zero windows', () => {
      expect(computeWindowRange(0, 0, 5, 2)).toEqual({
        start: 0,
        end: 0,
        size: 0,
        total: 0,
      });
      expect(computeWindowRange(10, 2, 0, 1)).toEqual({
        start: 0,
        end: 0,
        size: 0,
        total: 10,
      });
    });
  });

  describe('sliceWindow', () => {
    it('returns both sliced rows and the computed range', () => {
      const source = ['a', 'b', 'c', 'd', 'e'];
      const { rows, range } = sliceWindow(source, 2, 2, 1);

      expect(rows).toEqual(['b', 'c', 'd', 'e']);
      expect(range).toEqual({
        start: 1,
        end: 5,
        size: 4,
        total: 5,
      });
    });
  });

  describe('createVirtualTreeIndexMaps', () => {
    it('builds key/index and id/index lookups', () => {
      const rows = flattenTree(makeTree());
      const maps = createVirtualTreeIndexMaps(rows);

      expect(maps.keyByIndex).toEqual(['ipb-node-10', 'ipb-node-11', 'ipb-node-12', 'ipb-node-13']);
      expect(maps.indexByKey.get('ipb-node-12')).toBe(2);
      expect(maps.indexByNodeId.get(13)).toBe(3);
    });

    it('keeps first occurrence for duplicate keys or ids', () => {
      const duplicated = [
        { ...flattenTree(makeTree())[0] },
        { ...flattenTree(makeTree())[0], index: 1 },
      ];
      const maps = createVirtualTreeIndexMaps(duplicated);

      expect(maps.indexByKey.get('ipb-node-10')).toBe(0);
      expect(maps.indexByNodeId.get(10)).toBe(0);
    });
  });
});
