import type { InjectionKey } from 'vue';
import type { UsePageBuilderReturn } from '@/composables/use-page-builder';
import type { useEditor } from '@/composables/use-editor';
import type { useNodeTree } from '@/composables/use-node-tree';
import type { useDragDrop } from '@/composables/use-drag-drop';

/**
 * Typed injection keys for provide/inject across the editor component tree.
 * Use these instead of raw strings for type-safe inject() calls.
 */
export const PAGE_BUILDER_KEY: InjectionKey<UsePageBuilderReturn> = Symbol('pageBuilder');
export const EDITOR_KEY: InjectionKey<ReturnType<typeof useEditor>> = Symbol('editor');
export const NODE_TREE_KEY: InjectionKey<ReturnType<typeof useNodeTree>> = Symbol('nodeTree');
export const DRAG_DROP_KEY: InjectionKey<ReturnType<typeof useDragDrop>> = Symbol('dragDrop');
