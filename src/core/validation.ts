import type { INode, IPageData, IPageMeta } from '@/types/node';
import { normalizeSafeHtmlTag, sanitizeUrlByKind } from '@/core/sanitize';

export interface IValidationError {
  path: string;
  message: string;
}

export interface IValidationResult {
  isValid: boolean;
  errors: IValidationError[];
}

interface IValidationContext {
  errors: IValidationError[];
  seenIds: Set<number>;
  seenNodes: WeakSet<object>;
  maxObservedId: number;
  visitedNodeCount: number;
  depthGuardTriggered: boolean;
  sizeGuardTriggered: boolean;
}

const PAGE_STATUSES = new Set<IPageMeta['status']>(['draft', 'published', 'archived']);
const MAX_VALIDATION_DEPTH = 200;
const MAX_VALIDATION_NODE_COUNT = 5000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addError(context: IValidationContext, path: string, message: string): void {
  context.errors.push({ path, message });
}

function validatePbTextProps(
  props: Record<string, unknown>,
  path: string,
  context: IValidationContext,
): void {
  if (props.tag === undefined) return;

  if (typeof props.tag !== 'string' || props.tag.trim() === '') {
    addError(context, `${path}.tag`, 'PbText props.tag must be a non-empty string.');
    return;
  }

  const normalizedTag = props.tag.trim().toLowerCase();
  if (normalizeSafeHtmlTag(props.tag) !== normalizedTag) {
    addError(
      context,
      `${path}.tag`,
      'PbText props.tag must be one of: div, p, span, h1, h2, h3, h4, h5, h6, section, article, blockquote.',
    );
  }
}

function validatePbImageProps(
  props: Record<string, unknown>,
  path: string,
  context: IValidationContext,
): void {
  if (typeof props.src !== 'string' || props.src.trim() === '') {
    addError(context, `${path}.src`, 'PbImage props.src must be a non-empty string.');
    return;
  }

  if (sanitizeUrlByKind(props.src, 'media') === '') {
    addError(context, `${path}.src`, 'PbImage props.src contains an unsafe URL.');
  }
}

function validatePbVideoProps(
  props: Record<string, unknown>,
  path: string,
  context: IValidationContext,
): void {
  if (typeof props.src !== 'string' || props.src.trim() === '') {
    addError(context, `${path}.src`, 'PbVideo props.src must be a non-empty string.');
    return;
  }

  if (sanitizeUrlByKind(props.src, 'media') === '') {
    addError(context, `${path}.src`, 'PbVideo props.src contains an unsafe URL.');
  }

  const poster = props.poster;
  if (poster !== undefined && poster !== null && poster !== '') {
    if (typeof poster !== 'string') {
      addError(context, `${path}.poster`, 'PbVideo props.poster must be a string.');
    } else if (poster.trim() !== '' && sanitizeUrlByKind(poster, 'media') === '') {
      addError(context, `${path}.poster`, 'PbVideo props.poster contains an unsafe URL.');
    }
  }
}

function validatePbSectionProps(
  props: Record<string, unknown>,
  path: string,
  context: IValidationContext,
): void {
  const backgroundImage = props.backgroundImage;
  if (backgroundImage === undefined || backgroundImage === null || backgroundImage === '') return;

  if (typeof backgroundImage !== 'string') {
    addError(context, `${path}.backgroundImage`, 'PbSection props.backgroundImage must be a string.');
    return;
  }

  if (backgroundImage.trim() !== '' && sanitizeUrlByKind(backgroundImage, 'background') === '') {
    addError(context, `${path}.backgroundImage`, 'PbSection props.backgroundImage contains an unsafe URL.');
  }
}

function validateKnownComponentPropsInto(
  name: string,
  props: Record<string, unknown>,
  path: string,
  context: IValidationContext,
): void {
  if (name === 'PbText') {
    validatePbTextProps(props, path, context);
    return;
  }

  if (name === 'PbImage') {
    validatePbImageProps(props, path, context);
    return;
  }

  if (name === 'PbVideo') {
    validatePbVideoProps(props, path, context);
    return;
  }

  if (name === 'PbSection') {
    validatePbSectionProps(props, path, context);
  }
}

function validateNodeInto(node: unknown, path: string, context: IValidationContext, depth = 0): void {
  if (depth > MAX_VALIDATION_DEPTH) {
    if (!context.depthGuardTriggered) {
      addError(
        context,
        path,
        `Maximum node depth (${String(MAX_VALIDATION_DEPTH)}) exceeded during validation.`,
      );
      context.depthGuardTriggered = true;
    }
    return;
  }

  if (context.visitedNodeCount >= MAX_VALIDATION_NODE_COUNT) {
    if (!context.sizeGuardTriggered) {
      addError(
        context,
        path,
        `Maximum node count (${String(MAX_VALIDATION_NODE_COUNT)}) exceeded during validation.`,
      );
      context.sizeGuardTriggered = true;
    }
    return;
  }

  if (!isRecord(node)) {
    addError(context, path, 'Node must be an object.');
    return;
  }

  if (context.seenNodes.has(node)) {
    addError(context, path, 'Cycle detected in node tree.');
    return;
  }
  context.seenNodes.add(node);
  context.visitedNodeCount++;

  const id = node.id;
  const name = node.name;
  const slot = node.slot;
  const props = node.props;
  const children = node.children;
  const readonly = node.readonly;

  if (!(typeof id === 'number' && Number.isInteger(id)) || id <= 0) {
    addError(context, `${path}.id`, 'id must be a positive integer.');
  } else {
    if (context.seenIds.has(id)) {
      addError(context, `${path}.id`, `Duplicate node id "${id}" found.`);
    }
    context.seenIds.add(id);
    if (id > context.maxObservedId) context.maxObservedId = id;
  }

  if (typeof name !== 'string' || name.trim() === '') {
    addError(context, `${path}.name`, 'name must be a non-empty string.');
  }

  if (!(slot === null || typeof slot === 'string')) {
    addError(context, `${path}.slot`, 'slot must be a string or null.');
  }

  if (!isRecord(props)) {
    addError(context, `${path}.props`, 'props must be an object.');
  } else if (typeof name === 'string') {
    validateKnownComponentPropsInto(name, props, `${path}.props`, context);
  }

  if (!Array.isArray(children)) {
    addError(context, `${path}.children`, 'children must be an array.');
    return;
  }

  if (!(readonly === undefined || typeof readonly === 'boolean')) {
    addError(context, `${path}.readonly`, 'readonly must be a boolean when provided.');
  }

  for (let index = 0; index < children.length; index++) {
    if (context.sizeGuardTriggered) break;
    validateNodeInto(children[index], `${path}.children[${index}]`, context, depth + 1);
  }
}

export function validateNode(node: unknown, path = 'node'): IValidationResult {
  const context: IValidationContext = {
    errors: [],
    seenIds: new Set<number>(),
    seenNodes: new WeakSet<object>(),
    maxObservedId: 0,
    visitedNodeCount: 0,
    depthGuardTriggered: false,
    sizeGuardTriggered: false,
  };

  validateNodeInto(node, path, context);

  return {
    isValid: context.errors.length === 0,
    errors: context.errors,
  };
}

export function validatePageData(pageData: unknown): IValidationResult {
  const context: IValidationContext = {
    errors: [],
    seenIds: new Set<number>(),
    seenNodes: new WeakSet<object>(),
    maxObservedId: 0,
    visitedNodeCount: 0,
    depthGuardTriggered: false,
    sizeGuardTriggered: false,
  };

  if (!isRecord(pageData)) {
    addError(context, 'pageData', 'pageData must be an object.');
    return {
      isValid: false,
      errors: context.errors,
    };
  }

  const { meta, content, layout, maxId, variables } = pageData;

  if (!isRecord(meta)) {
    addError(context, 'meta', 'meta must be an object.');
  } else {
    if (typeof meta.id !== 'string' || meta.id.trim() === '') {
      addError(context, 'meta.id', 'meta.id must be a non-empty string.');
    }
    if (typeof meta.name !== 'string' || meta.name.trim() === '') {
      addError(context, 'meta.name', 'meta.name must be a non-empty string.');
    }
    if (typeof meta.url !== 'string' || meta.url.trim() === '') {
      addError(context, 'meta.url', 'meta.url must be a non-empty string.');
    } else if (sanitizeUrlByKind(meta.url, 'link') === '') {
      addError(context, 'meta.url', 'meta.url contains an unsafe URL.');
    }
    if (typeof meta.status !== 'string' || !PAGE_STATUSES.has(meta.status as IPageMeta['status'])) {
      addError(
        context,
        'meta.status',
        'meta.status must be one of: draft, published, archived.',
      );
    }
    if (!(meta.updatedAt === undefined || typeof meta.updatedAt === 'string')) {
      addError(context, 'meta.updatedAt', 'meta.updatedAt must be a string when provided.');
    }
    if (!(meta.createdAt === undefined || typeof meta.createdAt === 'string')) {
      addError(context, 'meta.createdAt', 'meta.createdAt must be a string when provided.');
    }
  }

  validateNodeInto(content, 'content', context);
  validateNodeInto(layout, 'layout', context);

  if (!(typeof maxId === 'number' && Number.isInteger(maxId)) || maxId < 0) {
    addError(context, 'maxId', 'maxId must be a non-negative integer.');
  } else if (maxId < context.maxObservedId) {
    addError(
      context,
      'maxId',
      `maxId (${String(maxId)}) must be greater than or equal to the maximum node id (${String(context.maxObservedId)}).`,
    );
  }

  if (!isRecord(variables)) {
    addError(context, 'variables', 'variables must be an object.');
  } else {
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value !== 'string') {
        addError(context, `variables.${key}`, 'Variable values must be strings.');
      }
    }
  }

  return {
    isValid: context.errors.length === 0,
    errors: context.errors,
  };
}
