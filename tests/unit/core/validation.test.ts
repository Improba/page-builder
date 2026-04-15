import { validateNode, validatePageData } from '@/core/validation';
import type { INode, IPageData } from '@/types/node';

function makeNode(overrides: Partial<INode> = {}): INode {
  return {
    id: 1,
    name: 'PbSection',
    slot: null,
    props: {},
    children: [],
    ...overrides,
  };
}

function makePageData(overrides: Partial<IPageData> = {}): IPageData {
  return {
    meta: {
      id: 'page-1',
      name: 'Validation Test Page',
      url: '/validation-test',
      status: 'draft',
    },
    tree: makeNode({
      id: 100,
      name: 'PbContainer',
      slot: null,
      children: [
        makeNode({
          id: 1,
          name: 'PbSection',
          slot: 'default',
          children: [makeNode({ id: 2, name: 'PbText', slot: 'default', props: { tag: 'p' } })],
        }),
      ],
    }),
    contentRootId: 1,
    maxId: 100,
    variables: { TITLE: 'Hello' },
    ...overrides,
  };
}

describe('validateNode', () => {
  it('returns valid for a well-formed node tree', () => {
    const node = makeNode({
      children: [makeNode({ id: 2, slot: 'default' }), makeNode({ id: 3, slot: 'sidebar' })],
    });

    const result = validateNode(node);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('reports duplicate IDs and malformed fields', () => {
    const node: unknown = {
      id: 0,
      name: '',
      slot: 12,
      props: null,
      readonly: 'yes',
      children: [
        {
          id: 2,
          name: 'Child',
          slot: 'default',
          props: {},
          children: [],
        },
        {
          id: 2,
          name: 'Child Duplicate',
          slot: 'default',
          props: {},
          children: [],
        },
      ],
    };

    const result = validateNode(node);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        { path: 'node.id', message: 'id must be a positive integer.' },
        { path: 'node.name', message: 'name must be a non-empty string.' },
        { path: 'node.slot', message: 'slot must be a string or null.' },
        { path: 'node.props', message: 'props must be an object.' },
        { path: 'node.readonly', message: 'readonly must be a boolean when provided.' },
        { path: 'node.children[1].id', message: 'Duplicate node id "2" found.' },
      ]),
    );
  });

  it('reports non-object nodes', () => {
    const result = validateNode('not-an-object');

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ path: 'node', message: 'Node must be an object.' }]);
  });

  it('detects cycles without recursing indefinitely', () => {
    const root = makeNode({ id: 1, name: 'Root', slot: null, children: [] });
    const child = makeNode({ id: 2, name: 'Child', slot: 'default', children: [] });
    root.children.push(child);
    child.children.push(root);

    const result = validateNode(root);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Cycle detected in node tree.',
        }),
      ]),
    );
  });

  it('guards against excessively deep trees', () => {
    let cursor = makeNode({ id: 1, name: 'DepthRoot', slot: null });
    const root = cursor;

    for (let id = 2; id <= 260; id++) {
      const child = makeNode({ id, name: `Depth-${String(id)}`, slot: 'default' });
      cursor.children = [child];
      cursor = child;
    }

    const result = validateNode(root);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('Maximum node depth'),
        }),
      ]),
    );
  });

  it('guards against excessively large trees', () => {
    const largeRoot = makeNode({
      id: 1,
      name: 'LargeRoot',
      slot: null,
      children: Array.from({ length: 5001 }, (_, index) =>
        makeNode({
          id: index + 2,
          name: `Child-${String(index + 2)}`,
          slot: 'default',
        }),
      ),
    });

    const result = validateNode(largeRoot);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('Maximum node count'),
        }),
      ]),
    );
  });

  it('reports unsafe built-in component props', () => {
    const result = validateNode({
      id: 1,
      name: 'PbText',
      slot: null,
      props: { tag: 'script' },
      children: [
        {
          id: 2,
          name: 'PbImage',
          slot: 'default',
          props: { src: 'javascript:alert(1)' },
          children: [],
        },
        {
          id: 3,
          name: 'PbSection',
          slot: 'default',
          props: { backgroundImage: 'javascript:alert(1)' },
          children: [],
        },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          path: 'node.props.tag',
          message:
            'PbText props.tag must be one of: div, p, span, h1, h2, h3, h4, h5, h6, section, article, blockquote.',
        },
        {
          path: 'node.children[0].props.src',
          message: 'PbImage props.src contains an unsafe URL.',
        },
        {
          path: 'node.children[1].props.backgroundImage',
          message: 'PbSection props.backgroundImage contains an unsafe URL.',
        },
      ]),
    );
  });
});

describe('validatePageData', () => {
  it('returns valid for a well-formed page payload', () => {
    const result = validatePageData(makePageData());

    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(true);
  });

  it('reports malformed page fields and invalid enum values', () => {
    const invalidPayload = {
      ...makePageData(),
      meta: {
        id: '',
        name: '',
        url: '',
        status: 'unknown',
        createdAt: 123,
      },
      variables: {
        OK: 'value',
        BROKEN: 123,
      },
    };

    const result = validatePageData(invalidPayload);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        { path: 'meta.id', message: 'meta.id must be a non-empty string.' },
        { path: 'meta.name', message: 'meta.name must be a non-empty string.' },
        { path: 'meta.url', message: 'meta.url must be a non-empty string.' },
        {
          path: 'meta.status',
          message: 'meta.status must be one of: draft, published, archived.',
        },
        {
          path: 'meta.createdAt',
          message: 'meta.createdAt must be a string when provided.',
        },
        {
          path: 'variables.BROKEN',
          message: 'Variable values must be strings.',
        },
      ]),
    );
  });

  it('reports maxId lower than the largest node ID', () => {
    const payload = makePageData({ maxId: 2 });
    const result = validatePageData(payload);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      path: 'maxId',
      message: 'maxId (2) must be greater than or equal to the maximum node id (100).',
    });
  });

  it('reports duplicate IDs within the tree', () => {
    const payload = makePageData({
      tree: makeNode({
        id: 1,
        name: 'PbContainer',
        slot: null,
        children: [
          makeNode({ id: 1, name: 'PbSection', slot: 'default' }),
        ],
      }),
      contentRootId: 1,
      maxId: 1,
    });

    const result = validatePageData(payload);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      path: 'tree.children[0].id',
      message: 'Duplicate node id "1" found.',
    });
  });

  it('reports non-object page payloads', () => {
    const result = validatePageData(null);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ path: 'pageData', message: 'pageData must be an object.' }]);
  });

  it('reports unsafe meta URL values', () => {
    const payload = makePageData({
      meta: {
        ...makePageData().meta,
        url: 'javascript:alert(1)',
      },
    });
    const result = validatePageData(payload);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      path: 'meta.url',
      message: 'meta.url contains an unsafe URL.',
    });
  });

  it('detects cyclic tree structures in page payloads', () => {
    const cyclicTree = makeNode({ id: 1, name: 'Root', slot: null, children: [] });
    const child = makeNode({ id: 2, name: 'Child', slot: 'default', children: [] });
    cyclicTree.children.push(child);
    child.children.push(cyclicTree);

    const result = validatePageData(
      makePageData({
        tree: cyclicTree,
        contentRootId: 1,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Cycle detected in node tree.',
        }),
      ]),
    );
  });
});
