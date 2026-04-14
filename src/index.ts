export { PageBuilderPlugin } from './plugin';
export type { PageBuilderPluginOptions } from './plugin';
export {
  DEFAULT_LOCALE,
  defaultTranslations,
  createTranslator,
  mergeTranslations,
  translate,
  usePageBuilderI18n,
} from './i18n';
export type { TranslationDictionary, TranslationParams, Translator, PageBuilderI18nOptions } from './i18n';

export { default as PageBuilder } from './components/PageBuilder.vue';
export { default as PageReader } from './components/reader/PageReader.vue';
export { default as PageEditor } from './components/editor/PageEditor.vue';
export { default as NodeRenderer } from './components/reader/NodeRenderer.vue';

export {
  registerComponent,
  registerComponents,
  replaceComponent,
  unregisterComponent,
  getComponent,
  resolveComponent,
  getRegisteredComponents,
  getComponentsByCategory,
  hasComponent,
  clearRegistry,
} from './core/registry';

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
} from './core/tree';

export {
  PageBuilderError,
  isPageBuilderError,
} from './core/errors';
export type {
  PageBuilderErrorCode,
  PageBuilderErrorOptions,
} from './core/errors';

export { validateNode, validatePageData } from './core/validation';
export type { IValidationError, IValidationResult } from './core/validation';
export { sanitizeRichTextHtml, normalizeSafeHtmlTag, sanitizeUrlByKind } from './core/sanitize';

export {
  flattenTree,
  computeWindowRange,
  sliceWindow,
  createStableNodeKey,
  createVirtualTreeIndexMaps,
} from './core/virtual-tree';
export type {
  IVirtualTreeRow,
  IVirtualWindowRange,
  IVirtualTreeIndexMaps,
  IFlattenTreeOptions,
} from './core/virtual-tree';

export { usePageBuilder } from './composables/use-page-builder';
export type { UsePageBuilderOptions, UsePageBuilderReturn } from './composables/use-page-builder';

export { useEditor } from './composables/use-editor';

export { useNodeTree } from './composables/use-node-tree';
export type { UseNodeTreeOptions } from './composables/use-node-tree';

export { useDragDrop } from './composables/use-drag-drop';
export type { DragState } from './composables/use-drag-drop';

export { builtInComponents, PbColumn, PbRow, PbText, PbImage, PbVideo, PbSection, PbContainer } from './built-in';

export {
  VIEWPORT_PRESETS,
  builderOptionsPropType,
  PAGE_BUILDER_KEY,
  EDITOR_KEY,
  NODE_TREE_KEY,
  DRAG_DROP_KEY,
} from './types';

export type {
  INode,
  IPageData,
  IPageMeta,
  IPageSavePayload,
  IComponentDefinition,
  ISlotDefinition,
  IPropDefinition,
  ComponentCategory,
  PropEditorType,
  PageBuilderMode,
  IEditorState,
  IEditorHistoryEntry,
  IPageBuilderEvents,
  ViewportPreset,
  IViewportDimensions,
} from './types';
