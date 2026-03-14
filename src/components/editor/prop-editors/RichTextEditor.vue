<script setup lang="ts">
  import { computed, onMounted, ref, useAttrs, watch } from 'vue';
  import { sanitizeRichTextHtml, sanitizeUrlByKind } from '@/core/sanitize';
  import { usePageBuilderI18n } from '@/i18n';

  defineOptions({
    inheritAttrs: false,
  });

  const props = defineProps({
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: 'Type text...' },
  });

  const emit = defineEmits<{
    'update:modelValue': [value: string];
  }>();

  const editorRef = ref<HTMLDivElement | null>(null);
  const lastEmittedValue = ref('');

  function getSanitizedHtml(value: unknown): string {
    if (typeof value !== 'string') return '';
    return sanitizeRichTextHtml(value);
  }

  function syncEditorHtml(value: string) {
    const editor = editorRef.value;
    if (!editor) return;

    const sanitizedHtml = getSanitizedHtml(value);
    if (editor.innerHTML !== sanitizedHtml) {
      editor.innerHTML = sanitizedHtml;
    }
    lastEmittedValue.value = sanitizedHtml;
  }

  function emitCurrentHtml() {
    const editor = editorRef.value;
    if (!editor) return;

    const sanitizedHtml = getSanitizedHtml(editor.innerHTML);
    if (editor.innerHTML !== sanitizedHtml) {
      editor.innerHTML = sanitizedHtml;
    }
    if (sanitizedHtml === lastEmittedValue.value) return;

    lastEmittedValue.value = sanitizedHtml;
    emit('update:modelValue', sanitizedHtml);
  }

  function focusEditor() {
    editorRef.value?.focus();
  }

  function executeCommand(command: string, value?: string) {
    if (typeof document.execCommand !== 'function') return;
    document.execCommand(command, false, value);
  }

  function runCommand(command: 'bold' | 'italic' | 'insertUnorderedList' | 'insertOrderedList') {
    focusEditor();
    executeCommand(command);
    emitCurrentHtml();
  }

  function insertLink() {
    focusEditor();
    const rawUrl = window.prompt(t('richText.prompt.enterUrl'), t('richText.prompt.defaultUrl'));
    if (!rawUrl) return;

    const safeUrl = sanitizeUrlByKind(rawUrl, 'link');
    if (!safeUrl) return;

    executeCommand('createLink', safeUrl);
    emitCurrentHtml();
  }

  onMounted(() => {
    syncEditorHtml(getSanitizedHtml(props.modelValue));
  });

  watch(
    () => props.modelValue,
    (nextValue) => {
      syncEditorHtml(getSanitizedHtml(nextValue));
    }
  );

  const { t } = usePageBuilderI18n();
  const attrs = useAttrs();
  const contentAttrs = computed(() => {
    const { class: _class, style: _style, ...rest } = attrs as Record<string, unknown>;
    return rest;
  });
  const editorAriaLabel = computed(() => {
    const ariaLabelledBy = attrs['aria-labelledby'];
    const ariaLabel = attrs['aria-label'];
    if (ariaLabelledBy || ariaLabel) return undefined;
    return t('richText.aria.editor');
  });
</script>

<template>
  <div class="ipb-richtext-editor" :class="attrs.class" :style="attrs.style">
    <div class="ipb-richtext-editor__toolbar" role="toolbar" :aria-label="t('richText.aria.toolbar')">
      <button
        type="button"
        data-command="bold"
        :aria-label="t('richText.action.bold')"
        :title="t('richText.action.bold')"
        @click="runCommand('bold')"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        data-command="italic"
        :aria-label="t('richText.action.italic')"
        :title="t('richText.action.italic')"
        @click="runCommand('italic')"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        data-command="ul"
        :aria-label="t('richText.action.unorderedList')"
        :title="t('richText.action.unorderedList')"
        @click="runCommand('insertUnorderedList')"
      >
        UL
      </button>
      <button
        type="button"
        data-command="ol"
        :aria-label="t('richText.action.orderedList')"
        :title="t('richText.action.orderedList')"
        @click="runCommand('insertOrderedList')"
      >
        OL
      </button>
      <button
        type="button"
        data-command="link"
        :aria-label="t('richText.action.link')"
        :title="t('richText.action.link')"
        @click="insertLink"
      >
        {{ t('richText.action.link') }}
      </button>
    </div>

    <div
      v-bind="contentAttrs"
      ref="editorRef"
      class="ipb-richtext-editor__content"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      :aria-label="editorAriaLabel"
      :data-placeholder="placeholder"
      @input="emitCurrentHtml"
      @blur="emitCurrentHtml"
    />
  </div>
</template>

<style scoped>
  .ipb-richtext-editor {
    border: 1px solid var(--ipb-border-color, #e0e0e0);
    border-radius: 4px;
    overflow: hidden;
  }

  .ipb-richtext-editor__toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px;
    border-bottom: 1px solid var(--ipb-border-color, #e0e0e0);
    background: var(--ipb-surface-muted, #f8fafc);
  }

  .ipb-richtext-editor__toolbar button {
    min-width: 30px;
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--ipb-border-color, #d1d5db);
    border-radius: 4px;
    background: var(--ipb-drawer-bg, #fff);
    cursor: pointer;
    font-size: 12px;
  }

  .ipb-richtext-editor__toolbar button:hover {
    background: var(--ipb-surface-hover, #f3f4f6);
  }

  .ipb-richtext-editor__toolbar button:focus-visible,
  .ipb-richtext-editor__content:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: 1px;
  }

  .ipb-richtext-editor__content {
    min-height: 120px;
    padding: 8px;
    font-size: 13px;
    line-height: 1.5;
    outline: none;
  }

  .ipb-richtext-editor__content:empty::before {
    content: attr(data-placeholder);
    color: var(--ipb-text-muted, #9ca3af);
    pointer-events: none;
  }
</style>
