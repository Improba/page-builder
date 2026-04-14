/**
 * Vue-free core utilities for server-side (Node.js) usage.
 *
 * This barrel intentionally excludes:
 * - registry.ts / drop-slot.ts (import Vue's Component type)
 * - sanitizeRichTextHtml (requires DOM APIs)
 * - iframe-bridge.ts (browser-only)
 * - reportDevDiagnostic (uses import.meta.env.DEV)
 */

export {
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
  extractPlainText,
} from './tree';

export { validateNode, validatePageData } from './validation';
export type { IValidationError, IValidationResult } from './validation';

export { normalizeSafeHtmlTag, sanitizeUrlByKind } from './sanitize';

export {
  PageBuilderError,
  isPageBuilderError,
  createPageBuilderError,
  toErrorMessage,
} from './errors';
export type { PageBuilderErrorCode, PageBuilderErrorOptions } from './errors';

export {
  flattenTree,
  computeWindowRange,
  sliceWindow,
  createStableNodeKey,
  createVirtualTreeIndexMaps,
} from './virtual-tree';
export type {
  IVirtualTreeRow,
  IVirtualWindowRange,
  IVirtualTreeIndexMaps,
  IFlattenTreeOptions,
} from './virtual-tree';

export type {
  INode,
  IPageData,
  IPageMeta,
  IPageSavePayload,
} from '../types/node';
