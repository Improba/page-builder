import type { INode } from '@/types/node';

export interface DeterministicTreeFixture {
  root: INode;
  nodeCount: number;
  maxId: number;
  deepestLeafId: number;
  primaryBranchId: number;
  secondaryBranchId: number;
}

function createNode(id: number, level: number, slot: string | null): INode {
  return {
    id,
    name: `BenchNode${level}`,
    slot,
    props: {
      label: `Node ${id}`,
      depth: level,
    },
    children: [],
  };
}

/**
 * Build a deterministic balanced tree with depth-first incremental IDs.
 * `depth` includes the root level (depth=1 => root only).
 */
export function createDeterministicTreeFixture(depth: number, breadth: number): DeterministicTreeFixture {
  const safeDepth = Math.max(1, Math.trunc(depth));
  const safeBreadth = Math.max(0, Math.trunc(breadth));
  let nextId = 1;

  function build(level: number, slot: string | null): INode {
    const node = createNode(nextId++, level, slot);

    if (level < safeDepth) {
      for (let i = 0; i < safeBreadth; i++) {
        node.children.push(build(level + 1, 'default'));
      }
    }

    return node;
  }

  const root = build(1, null);
  const nodeCount = nextId - 1;
  const primaryBranchId = root.children[0]?.id ?? root.id;
  const secondaryBranchId = root.children[1]?.id ?? primaryBranchId;

  return {
    root,
    nodeCount,
    maxId: nodeCount,
    deepestLeafId: nodeCount,
    primaryBranchId,
    secondaryBranchId,
  };
}
