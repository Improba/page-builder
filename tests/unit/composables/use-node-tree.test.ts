import { ref } from 'vue';
import type { INode } from '@/types/node';
import { useNodeTree } from '@/composables/use-node-tree';

function makeRoot(): INode {
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
        props: { title: 'Section 1' },
        children: [
          { id: 3, name: 'Text', slot: 'default', props: { text: 'Hello' }, children: [] },
        ],
      },
    ],
  };
}

function setup(initialRoot?: INode) {
  const content = ref<INode>(initialRoot ?? makeRoot());
  let idCounter = 10;
  const nextId = vi.fn(() => idCounter++);
  const onUpdate = vi.fn((newTree: INode) => {
    content.value = newTree;
  });
  const onSnapshot = vi.fn();

  const tree = useNodeTree({ content, nextId, onUpdate, onSnapshot });
  return { content, nextId, onUpdate, onSnapshot, ...tree };
}

describe('useNodeTree', () => {
  describe('addNode', () => {
    it('adds a child node to the specified parent', () => {
      const s = setup();
      s.addNode(2, 'Image', 1);

      expect(s.onUpdate).toHaveBeenCalledTimes(1);
      const updatedTree: INode = s.onUpdate.mock.calls[0][0];
      const section = updatedTree.children[0];
      expect(section.children).toHaveLength(2);
      expect(section.children[1].name).toBe('Image');
    });

    it('returns the generated node id', () => {
      const s = setup();
      const id = s.addNode(2, 'Button', 0);
      expect(id).toBe(10);
      expect(s.nextId).toHaveBeenCalledTimes(1);
    });

    it('applies default props when provided', () => {
      const s = setup();
      s.addNode(2, 'Card', 0, 'default', { color: 'blue' });

      const updatedTree: INode = s.onUpdate.mock.calls[0][0];
      expect(updatedTree.children[0].children[0].props).toEqual({ color: 'blue' });
    });

    it('calls onSnapshot with a label', () => {
      const s = setup();
      s.addNode(1, 'Comp', 0);
      expect(s.onSnapshot).toHaveBeenCalledWith('Add Comp');
    });

    it('returns null and skips updates when parent insertion fails', () => {
      const s = setup();
      const id = s.addNode(999, 'MissingParentChild', 0);

      expect(id).toBeNull();
      expect(s.nextId).not.toHaveBeenCalled();
      expect(s.onUpdate).not.toHaveBeenCalled();
      expect(s.onSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('deleteNode', () => {
    it('removes a node from the tree', () => {
      const s = setup();
      s.deleteNode(3);

      expect(s.onUpdate).toHaveBeenCalledTimes(1);
      const updatedTree: INode = s.onUpdate.mock.calls[0][0];
      expect(updatedTree.children[0].children).toHaveLength(0);
    });

    it('does not mutate the original tree', () => {
      const s = setup();
      const originalRoot = s.content.value;
      s.deleteNode(3);
      expect(originalRoot.children[0].children).toHaveLength(1);
    });
  });

  describe('moveNodeTo', () => {
    it('repositions a node to a new parent', () => {
      const root: INode = {
        id: 1,
        name: 'Root',
        slot: null,
        props: {},
        children: [
          {
            id: 2,
            name: 'A',
            slot: 'default',
            props: {},
            children: [
              { id: 3, name: 'Child', slot: 'default', props: {}, children: [] },
            ],
          },
          { id: 4, name: 'B', slot: 'default', props: {}, children: [] },
        ],
      };

      const s = setup(root);
      s.moveNodeTo(3, 4, 0);

      const updatedTree: INode = s.onUpdate.mock.calls[0][0];
      expect(updatedTree.children[0].children).toHaveLength(0);
      expect(updatedTree.children[1].children).toHaveLength(1);
      expect(updatedTree.children[1].children[0].name).toBe('Child');
    });

    it('ignores invalid moves that target a missing parent', () => {
      const s = setup();
      s.moveNodeTo(3, 999, 0);

      expect(s.onUpdate).not.toHaveBeenCalled();
      expect(s.onSnapshot).not.toHaveBeenCalled();
      expect(s.content.value.children[0].children).toHaveLength(1);
    });

    it('ignores invalid moves into the source subtree', () => {
      const s = setup();
      s.moveNodeTo(2, 3, 0);

      expect(s.onUpdate).not.toHaveBeenCalled();
      expect(s.onSnapshot).not.toHaveBeenCalled();
      expect(s.content.value.children).toHaveLength(1);
      expect(s.content.value.children[0].children).toHaveLength(1);
    });
  });

  describe('moveNodeUp / moveNodeDown', () => {
    function makeSiblingRoot(readonly = false): INode {
      return {
        id: 1,
        name: 'Root',
        slot: null,
        props: {},
        children: [
          { id: 2, name: 'A', slot: 'default', props: {}, children: [] },
          { id: 3, name: 'B', slot: 'default', props: {}, readonly, children: [] },
          { id: 4, name: 'C', slot: 'default', props: {}, children: [] },
        ],
      };
    }

    it('reports move capabilities from sibling position', () => {
      const s = setup(makeSiblingRoot());

      expect(s.canMoveNodeUp(2)).toBe(false);
      expect(s.canMoveNodeDown(2)).toBe(true);
      expect(s.canMoveNodeUp(3)).toBe(true);
      expect(s.canMoveNodeDown(4)).toBe(false);
    });

    it('moves a node up among siblings', () => {
      const s = setup(makeSiblingRoot());
      s.moveNodeUp(3);

      const updatedTree: INode = s.onUpdate.mock.calls[0][0];
      expect(updatedTree.children.map((child) => child.id)).toEqual([3, 2, 4]);
      expect(s.onSnapshot).toHaveBeenCalledWith('Move node up');
    });

    it('moves a node down among siblings', () => {
      const s = setup(makeSiblingRoot());
      s.moveNodeDown(3);

      const updatedTree: INode = s.onUpdate.mock.calls[0][0];
      expect(updatedTree.children.map((child) => child.id)).toEqual([2, 4, 3]);
      expect(s.onSnapshot).toHaveBeenCalledWith('Move node down');
    });

    it('does not move readonly nodes', () => {
      const s = setup(makeSiblingRoot(true));
      s.moveNodeUp(3);

      expect(s.onUpdate).not.toHaveBeenCalled();
      expect(s.canMoveNodeUp(3)).toBe(false);
      expect(s.canMoveNodeDown(3)).toBe(false);
    });
  });

  describe('updateNodeProps', () => {
    it('merges new props into existing ones', () => {
      const s = setup();
      s.updateNodeProps(3, { text: 'Updated', color: 'red' });

      const updatedTree: INode = s.onUpdate.mock.calls[0][0];
      const node = updatedTree.children[0].children[0];
      expect(node.props).toEqual({ text: 'Updated', color: 'red' });
    });

    it('preserves existing props not included in the update', () => {
      const root: INode = {
        id: 1,
        name: 'Root',
        slot: null,
        props: {},
        children: [
          { id: 2, name: 'Comp', slot: 'default', props: { a: 1, b: 2 }, children: [] },
        ],
      };
      const s = setup(root);
      s.updateNodeProps(2, { b: 99, c: 3 });

      const updatedTree: INode = s.onUpdate.mock.calls[0][0];
      expect(updatedTree.children[0].props).toEqual({ a: 1, b: 99, c: 3 });
    });

    it('skips update and snapshot when node is missing', () => {
      const s = setup();

      s.updateNodeProps(999, { text: 'No-op' });

      expect(s.onUpdate).not.toHaveBeenCalled();
      expect(s.onSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('duplicateNode', () => {
    it('creates a copy with new IDs inserted after the original', () => {
      const s = setup();
      s.duplicateNode(3);

      const updatedTree: INode = s.onUpdate.mock.calls[0][0];
      const section = updatedTree.children[0];
      expect(section.children).toHaveLength(2);
      expect(section.children[0].id).toBe(3);
      expect(section.children[1].id).toBe(10);
      expect(section.children[1].name).toBe('Text');
      expect(section.children[1].props).toEqual({ text: 'Hello' });
    });

    it('assigns new IDs to all nested children', () => {
      const root: INode = {
        id: 1,
        name: 'Root',
        slot: null,
        props: {},
        children: [
          {
            id: 2,
            name: 'Parent',
            slot: 'default',
            props: {},
            children: [
              {
                id: 3,
                name: 'Nested',
                slot: 'default',
                props: {},
                children: [
                  { id: 4, name: 'Deep', slot: 'default', props: {}, children: [] },
                ],
              },
            ],
          },
        ],
      };

      const s = setup(root);
      s.duplicateNode(3);

      const updatedTree: INode = s.onUpdate.mock.calls[0][0];
      const parent = updatedTree.children[0];
      expect(parent.children).toHaveLength(2);

      const cloned = parent.children[1];
      expect(cloned.id).not.toBe(3);
      expect(cloned.children[0].id).not.toBe(4);
    });

    it('skips update and snapshot when source node is missing', () => {
      const s = setup();

      s.duplicateNode(999);

      expect(s.onUpdate).not.toHaveBeenCalled();
      expect(s.onSnapshot).not.toHaveBeenCalled();
    });
  });
});
