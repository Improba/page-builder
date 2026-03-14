import type { Component, PropType } from 'vue';

/**
 * Metadata describing a page builder component.
 * Every component registered in the page builder must provide this.
 */
export interface IComponentDefinition {
  /** Unique name used as key in the registry and in INode.name. */
  name: string;

  /** Human-readable label shown in the editor palette. */
  label: string;

  /** Short description for the editor tooltip. */
  description?: string;

  /** Category for grouping in the component palette. */
  category: ComponentCategory;

  /** URL or import path of a preview icon/thumbnail for the palette. */
  icon?: string;

  /** The Vue component to render. */
  component: Component;

  /** Named slots this component exposes for child nodes. */
  slots: ISlotDefinition[];

  /** Editable props schema for the right-drawer property editor. */
  editableProps: IPropDefinition[];

  /** Default props applied when the component is first added. */
  defaultProps?: Record<string, unknown>;

  /** If true, this component cannot be added by users (used for internal wrappers). */
  hidden?: boolean;
}

export type ComponentCategory =
  | 'layout'
  | 'content'
  | 'media'
  | 'navigation'
  | 'form'
  | 'data'
  | 'custom';

export interface ISlotDefinition {
  /** Slot name matching Vue's named slot system. */
  name: string;

  /** Human-readable label. */
  label: string;

  /** Component names allowed in this slot. Empty array = all allowed. */
  allowedComponents?: string[];
}

export interface IPropDefinition {
  /** Prop key (matches the component prop name). */
  key: string;

  /** Human-readable label for the property editor. */
  label: string;

  /** Editor widget type. */
  type: PropEditorType;

  /** Default value. */
  defaultValue?: unknown;

  /** Whether this prop is required. */
  required?: boolean;

  /** For 'select' type — available options. */
  options?: { label: string; value: string | number | boolean }[];

  /** Validation rules. */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export type PropEditorType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'image'
  | 'url'
  | 'json';

/**
 * Vue prop type helper for builderOptions.
 * Components expose this as a static property so the registry can read it.
 */
export const builderOptionsPropType = {
  type: Object as PropType<IComponentDefinition>,
};
