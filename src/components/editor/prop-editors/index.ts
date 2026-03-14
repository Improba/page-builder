import type { Component } from 'vue';
import type { PropEditorType } from '@/types/component';
import PropTextEditor from './PropTextEditor.vue';
import PropNumberEditor from './PropNumberEditor.vue';
import PropBooleanEditor from './PropBooleanEditor.vue';
import PropSelectEditor from './PropSelectEditor.vue';
import PropColorEditor from './PropColorEditor.vue';
import RichTextEditor from './RichTextEditor.vue';
import MediaPicker from './MediaPicker.vue';

export const DEFAULT_PROP_EDITOR = PropTextEditor;

export const PROP_EDITORS: Partial<Record<PropEditorType, Component>> = {
  text: PropTextEditor,
  textarea: PropTextEditor,
  richtext: RichTextEditor,
  number: PropNumberEditor,
  boolean: PropBooleanEditor,
  select: PropSelectEditor,
  color: PropColorEditor,
  image: MediaPicker,
  url: MediaPicker,
  json: PropTextEditor,
};
