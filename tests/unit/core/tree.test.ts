import type { INode } from '@/types/node';
import {
  cloneTree,
  findNodeById,
  findParent,
  removeNode,
  insertNode,
  moveNode,
  createNode,
  walkTree,
  countNodes,
  getMaxId,
  interpolateProps,
} from '@/core/tree';

function makeTree(): INode {
  return {
    id: 1,
    name: 'Root',
    slot: null,
    props: {},
    children: [
      {
        id: 2,
        name: 'Section',
        slot: 'default',
        props: { title: 'Hello' },
        children: [
          { id: 3, name: 'Text', slot: 'default', props: { text: 'Hi' }, children: [] },
          { id: 4, name: 'Image', slot: 'default', props: { src: '/img.png' }, children: [] },
        ],
      },
      {
        id: 5,
        name: 'Footer',
        slot: 'default',
        props: {},
        children: [],
      },
    ],
  };
}

describe('Tree utilities', () => {
  describe('cloneTree', () => {
    it('creates a deep copy of the tree', () => {
      const tree = makeTree();
      const copy = cloneTree(tree);

      expect(copy).toEqual(tree);
      expect(copy).not.toBe(tree);
      expect(copy.children[0]).not.toBe(tree.children[0]);
      expect(copy.children[0].children[0]).not.toBe(tree.children[0].children[0]);
    });

    it('does not share references with the original', () => {
      const tree = makeTree();
      const copy = cloneTree(tree);

      copy.children[0].props.title = 'Changed';
      expect(tree.children[0].props.title).toBe('Hello');
    });
  });

  describe('findNodeById', () => {
    it('finds the root node', () => {
      const tree = makeTree();
      expect(findNodeById(tree, 1)).toBe(tree);
    });

    it('finds a direct child', () => {
      const tree = makeTree();
      const node = findNodeById(tree, 2);
      expect(node?.name).toBe('Section');
    });

    it('finds a deeply nested node', () => {
      const tree = makeTree();
      const node = findNodeById(tree, 3);
      expect(node?.name).toBe('Text');
    });

    it('returns undefined for a missing id', () => {
      const tree = makeTree();
      expect(findNodeById(tree, 999)).toBeUndefined();
    });
  });

  describe('findParent', () => {
    it('returns the parent and index of a child node', () => {
      const tree = makeTree();
      const result = findParent(tree, 4);
      expect(result).toBeDefined();
      expect(result!.parent.id).toBe(2);
      expect(result!.index).toBe(1);
    });

    it('returns parent and index for a top-level child', () => {
      const tree = makeTree();
      const result = findParent(tree, 5);
      expect(result!.parent.id).toBe(1);
      expect(result!.index).toBe(1);
    });

    it('returns undefined when the node is the root', () => {
      const tree = makeTree();
      expect(findParent(tree, 1)).toBeUndefined();
    });

    it('returns undefined for a non-existent id', () => {
      const tree = makeTree();
      expect(findParent(tree, 999)).toBeUndefined();
    });
  });

  describe('removeNode', () => {
    it('removes a node and returns it', () => {
      const tree = makeTree();
      const removed = removeNode(tree, 3);

      expect(removed?.name).toBe('Text');
      expect(tree.children[0].children).toHaveLength(1);
      expect(findNodeById(tree, 3)).toBeUndefined();
    });

    it('returns undefined when the node does not exist', () => {
      const tree = makeTree();
      expect(removeNode(tree, 999)).toBeUndefined();
    });
  });

  describe('insertNode', () => {
    it('inserts a node at the correct position', () => {
      const tree = makeTree();
      const newNode = createNode(10, 'NewComp');

      const result = insertNode(tree, 2, newNode, 1);
      expect(result).toBe(true);
      expect(tree.children[0].children).toHaveLength(3);
      expect(tree.children[0].children[1].id).toBe(10);
    });

    it('assigns the slot on the inserted node', () => {
      const tree = makeTree();
      const newNode = createNode(10, 'NewComp');

      insertNode(tree, 2, newNode, 0, 'sidebar');
      expect(tree.children[0].children[0].slot).toBe('sidebar');
    });

    it('returns false when the parent does not exist', () => {
      const tree = makeTree();
      const newNode = createNode(10, 'NewComp');
      expect(insertNode(tree, 999, newNode, 0)).toBe(false);
    });
  });

  describe('moveNode', () => {
    it('relocates a node to a different parent', () => {
      const tree = makeTree();

      const result = moveNode(tree, 3, 5, 0);
      expect(result).toBe(true);
      expect(tree.children[0].children).toHaveLength(1);
      expect(tree.children[1].children).toHaveLength(1);
      expect(tree.children[1].children[0].name).toBe('Text');
    });

    it('returns false when the source node does not exist', () => {
      const tree = makeTree();
      expect(moveNode(tree, 999, 5, 0)).toBe(false);
    });

    it('rolls back without losing nodes when target parent is invalid', () => {
      const tree = makeTree();
      const initialChildIds = tree.children[0].children.map((child) => child.id);

      const result = moveNode(tree, 3, 999, 0);

      expect(result).toBe(false);
      expect(tree.children[0].children.map((child) => child.id)).toEqual(initialChildIds);
      expect(findNodeById(tree, 3)).toBeDefined();
    });

    it('handles same-parent moves without off-by-one', () => {
      const tree = makeTree();
      // Section (id:2) has children: [Text(id:3), Image(id:4)]
      // Move Text(id:3, index 0) to index 1 (after Image) within same parent
      const result = moveNode(tree, 3, 2, 1);
      expect(result).toBe(true);
      expect(tree.children[0].children[0].name).toBe('Image');
      expect(tree.children[0].children[1].name).toBe('Text');
    });

    it('handles same-parent move to earlier position', () => {
      const tree = makeTree();
      // Move Image(id:4, index 1) to index 0 within same parent
      const result = moveNode(tree, 4, 2, 0);
      expect(result).toBe(true);
      expect(tree.children[0].children[0].name).toBe('Image');
      expect(tree.children[0].children[1].name).toBe('Text');
    });
  });

  describe('createNode', () => {
    it('creates a node with defaults', () => {
      const node = createNode(42, 'MyComp');
      expect(node).toEqual({
        id: 42,
        name: 'MyComp',
        slot: 'default',
        props: {},
        children: [],
        readonly: undefined,
      });
    });

    it('accepts partial options', () => {
      const node = createNode(7, 'Custom', {
        slot: 'aside',
        props: { color: 'red' },
        readonly: true,
      });
      expect(node.slot).toBe('aside');
      expect(node.props).toEqual({ color: 'red' });
      expect(node.readonly).toBe(true);
      expect(node.children).toEqual([]);
    });
  });

  describe('walkTree', () => {
    it('visits all nodes depth-first', () => {
      const tree = makeTree();
      const visited: number[] = [];
      walkTree(tree, (node) => {
        visited.push(node.id);
      });
      expect(visited).toEqual([1, 2, 3, 4, 5]);
    });

    it('stops entire traversal when visitor returns false', () => {
      const tree = makeTree();
      const visited: number[] = [];
      walkTree(tree, (node) => {
        visited.push(node.id);
        if (node.id === 2) return false;
      });
      expect(visited).toEqual([1, 2]);
    });

    it('provides correct depth', () => {
      const tree = makeTree();
      const depths: Record<number, number> = {};
      walkTree(tree, (node, depth) => {
        depths[node.id] = depth;
      });
      expect(depths[1]).toBe(0);
      expect(depths[2]).toBe(1);
      expect(depths[3]).toBe(2);
    });
  });

  describe('countNodes', () => {
    it('counts all nodes in the tree', () => {
      expect(countNodes(makeTree())).toBe(5);
    });

    it('returns 1 for a single node', () => {
      expect(countNodes(createNode(1, 'Leaf'))).toBe(1);
    });
  });

  describe('getMaxId', () => {
    it('finds the maximum id in the tree', () => {
      expect(getMaxId(makeTree())).toBe(5);
    });

    it('returns root id for a single node', () => {
      expect(getMaxId(createNode(42, 'Solo'))).toBe(42);
    });
  });

  describe('interpolateProps', () => {
    it('replaces {{ VAR }} patterns with variable values', () => {
      const props = { greeting: 'Hello {{ NAME }}', count: 5 };
      const variables = { NAME: 'World' };

      const result = interpolateProps(props, variables);
      expect(result.greeting).toBe('Hello World');
      expect(result.count).toBe(5);
    });

    it('handles multiple variables in one string', () => {
      const props = { text: '{{ FIRST }} and {{ SECOND }}' };
      const variables = { FIRST: 'A', SECOND: 'B' };

      expect(interpolateProps(props, variables).text).toBe('A and B');
    });

    it('leaves unknown variables as-is', () => {
      const props = { text: 'Hello {{ MISSING }}' };
      const result = interpolateProps(props, {});
      expect(result.text).toBe('Hello {{ MISSING }}');
    });

    it('passes through non-string values unchanged', () => {
      const props = { flag: true, items: [1, 2], nested: { a: 1 } };
      const result = interpolateProps(props, {});
      expect(result.flag).toBe(true);
      expect(result.items).toEqual([1, 2]);
      expect(result.nested).toEqual({ a: 1 });
    });

    it('handles whitespace variations in template syntax', () => {
      const props = { a: '{{NAME}}', b: '{{  NAME  }}', c: '{{ NAME }}' };
      const variables = { NAME: 'X' };
      const result = interpolateProps(props, variables);
      expect(result.a).toBe('X');
      expect(result.b).toBe('X');
      expect(result.c).toBe('X');
    });

    it('returns an empty object when props payload is invalid', () => {
      const result = interpolateProps(null as unknown as Record<string, unknown>, { NAME: 'X' });
      expect(result).toEqual({});
    });
  });
});
