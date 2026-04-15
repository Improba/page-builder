<script setup lang="ts">
  import { computed, h, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue';
  import { icons as lucideIcons } from 'lucide';
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
  const activeFormats = ref<Set<string>>(new Set());

  type ExecCommand =
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikeThrough'
    | 'insertUnorderedList'
    | 'insertOrderedList';

  type BlockFormat = 'p' | 'h1' | 'h2' | 'h3' | 'blockquote' | 'pre';

  interface ToolbarAction {
    command: ExecCommand | 'formatBlock' | 'createLink' | 'removeFormat';
    icon: string;
    label: string;
    value?: string;
    group: number;
  }

  function kebabToPascal(str: string): string {
    return str
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  function renderLucideIcon(name: string, size = 15): ReturnType<typeof h> | null {
    const iconKey = kebabToPascal(name);
    const nodes = (lucideIcons as Record<string, [string, Record<string, string>][]>)[iconKey];
    if (!nodes) return null;
    return h(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
      },
      nodes.map(([tag, attrs]) => h(tag, attrs)),
    );
  }

  const { t } = usePageBuilderI18n();

  const actions = computed<ToolbarAction[]>(() => [
    { command: 'bold', icon: 'bold', label: t('richText.action.bold'), group: 0 },
    { command: 'italic', icon: 'italic', label: t('richText.action.italic'), group: 0 },
    { command: 'underline', icon: 'underline', label: t('richText.action.underline'), group: 0 },
    { command: 'strikeThrough', icon: 'strikethrough', label: t('richText.action.strikethrough'), group: 0 },
    { command: 'formatBlock', icon: 'heading-1', label: t('richText.action.heading1'), value: 'h1', group: 1 },
    { command: 'formatBlock', icon: 'heading-2', label: t('richText.action.heading2'), value: 'h2', group: 1 },
    { command: 'formatBlock', icon: 'heading-3', label: t('richText.action.heading3'), value: 'h3', group: 1 },
    { command: 'formatBlock', icon: 'pilcrow', label: t('richText.action.paragraph'), value: 'p', group: 1 },
    { command: 'insertUnorderedList', icon: 'list', label: t('richText.action.unorderedList'), group: 2 },
    { command: 'insertOrderedList', icon: 'list-ordered', label: t('richText.action.orderedList'), group: 2 },
    { command: 'formatBlock', icon: 'text-quote', label: t('richText.action.blockquote'), value: 'blockquote', group: 2 },
    { command: 'formatBlock', icon: 'code', label: t('richText.action.codeBlock'), value: 'pre', group: 2 },
    { command: 'createLink', icon: 'link', label: t('richText.action.link'), group: 3 },
    { command: 'removeFormat', icon: 'remove-formatting', label: t('richText.action.removeFormat'), group: 3 },
  ]);

  const groupedActions = computed(() => {
    const groups: ToolbarAction[][] = [];
    let currentGroup = -1;
    for (const action of actions.value) {
      if (action.group !== currentGroup) {
        groups.push([]);
        currentGroup = action.group;
      }
      groups[groups.length - 1].push(action);
    }
    return groups;
  });

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

  function refreshActiveFormats() {
    const next = new Set<string>();
    if (typeof document.queryCommandState !== 'function') return;

    for (const cmd of ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'] as const) {
      try {
        if (document.queryCommandState(cmd)) next.add(cmd);
      } catch {
        // queryCommandState can throw for unsupported commands
      }
    }

    try {
      const blockValue = document.queryCommandValue('formatBlock');
      if (blockValue) next.add(`formatBlock:${blockValue.toLowerCase()}`);
    } catch {
      // ignore
    }

    activeFormats.value = next;
  }

  function isActionActive(action: ToolbarAction): boolean {
    if (action.command === 'formatBlock' && action.value) {
      return activeFormats.value.has(`formatBlock:${action.value}`);
    }
    return activeFormats.value.has(action.command);
  }

  function handleAction(action: ToolbarAction) {
    focusEditor();

    if (action.command === 'createLink') {
      const rawUrl = window.prompt(t('richText.prompt.enterUrl'), t('richText.prompt.defaultUrl'));
      if (!rawUrl) return;
      const safeUrl = sanitizeUrlByKind(rawUrl, 'link');
      if (!safeUrl) return;
      executeCommand('createLink', safeUrl);
    } else if (action.command === 'formatBlock') {
      executeCommand('formatBlock', action.value);
    } else if (action.command === 'removeFormat') {
      executeCommand('removeFormat');
      executeCommand('formatBlock', 'p');
    } else {
      executeCommand(action.command);
    }

    emitCurrentHtml();
    refreshActiveFormats();
  }

  function handleSelectionChange() {
    if (!editorRef.value) return;
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.value.contains(range.commonAncestorContainer)) {
      refreshActiveFormats();
    }
  }

  onMounted(() => {
    syncEditorHtml(getSanitizedHtml(props.modelValue));
    document.addEventListener('selectionchange', handleSelectionChange);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('selectionchange', handleSelectionChange);
  });

  watch(
    () => props.modelValue,
    (nextValue) => {
      syncEditorHtml(getSanitizedHtml(nextValue));
    },
  );

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
      <div
        v-for="(group, groupIndex) in groupedActions"
        :key="groupIndex"
        class="ipb-richtext-editor__toolbar-group"
      >
        <button
          v-for="action in group"
          :key="action.icon"
          type="button"
          class="ipb-richtext-editor__btn"
          :class="{ 'ipb-richtext-editor__btn--active': isActionActive(action) }"
          :aria-label="action.label"
          :aria-pressed="isActionActive(action) ? 'true' : undefined"
          :title="action.label"
          @mousedown.prevent
          @click="handleAction(action)"
        >
          <component :is="() => renderLucideIcon(action.icon)" />
        </button>
      </div>
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
    border-radius: 6px;
    overflow: hidden;
  }

  .ipb-richtext-editor__toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 4px;
    border-bottom: 1px solid var(--ipb-border-color, #e0e0e0);
    background: var(--ipb-surface-muted, #f8fafc);
  }

  .ipb-richtext-editor__toolbar-group {
    display: flex;
    gap: 1px;
  }

  .ipb-richtext-editor__toolbar-group + .ipb-richtext-editor__toolbar-group::before {
    content: '';
    width: 1px;
    align-self: stretch;
    margin: 2px 3px;
    background: var(--ipb-border-color, #d1d5db);
  }

  .ipb-richtext-editor__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 26px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--ipb-text-color, #374151);
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
  }

  .ipb-richtext-editor__btn:hover {
    background: var(--ipb-surface-hover, #e5e7eb);
    border-color: var(--ipb-border-color, #d1d5db);
  }

  .ipb-richtext-editor__btn--active {
    background: var(--ipb-primary-soft, rgba(37, 99, 235, 0.12));
    color: var(--ipb-primary-color, #2563eb);
    border-color: var(--ipb-primary-color, rgba(37, 99, 235, 0.3));
  }

  .ipb-richtext-editor__btn--active:hover {
    background: var(--ipb-primary-soft, rgba(37, 99, 235, 0.18));
  }

  .ipb-richtext-editor__btn:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: 1px;
  }

  .ipb-richtext-editor__content {
    min-height: 140px;
    max-height: 400px;
    overflow-y: auto;
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--ipb-text-color, #111827);
    outline: none;
  }

  .ipb-richtext-editor__content:empty::before {
    content: attr(data-placeholder);
    color: var(--ipb-text-muted, #9ca3af);
    pointer-events: none;
  }

  /* Typography inside the editable area */

  .ipb-richtext-editor__content :deep(h1) {
    font-size: 1.5em;
    font-weight: 700;
    line-height: 1.3;
    margin: 0.6em 0 0.3em;
  }

  .ipb-richtext-editor__content :deep(h2) {
    font-size: 1.25em;
    font-weight: 600;
    line-height: 1.35;
    margin: 0.5em 0 0.25em;
  }

  .ipb-richtext-editor__content :deep(h3) {
    font-size: 1.1em;
    font-weight: 600;
    line-height: 1.4;
    margin: 0.4em 0 0.2em;
  }

  .ipb-richtext-editor__content :deep(p) {
    margin: 0.35em 0;
  }

  .ipb-richtext-editor__content :deep(blockquote) {
    margin: 0.5em 0;
    padding: 4px 12px;
    border-left: 3px solid var(--ipb-border-color, #d1d5db);
    color: var(--ipb-text-muted, #6b7280);
    font-style: italic;
  }

  .ipb-richtext-editor__content :deep(pre) {
    margin: 0.5em 0;
    padding: 8px 10px;
    background: var(--ipb-surface-muted, #f1f5f9);
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.9em;
    white-space: pre-wrap;
    overflow-x: auto;
  }

  .ipb-richtext-editor__content :deep(code) {
    padding: 1px 4px;
    background: var(--ipb-surface-muted, #f1f5f9);
    border-radius: 3px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.9em;
  }

  .ipb-richtext-editor__content :deep(ul) {
    margin: 0.35em 0;
    padding-left: 1.5em;
    list-style-type: disc;
  }

  .ipb-richtext-editor__content :deep(ol) {
    margin: 0.35em 0;
    padding-left: 1.5em;
    list-style-type: decimal;
  }

  .ipb-richtext-editor__content :deep(li) {
    margin: 0.15em 0;
    display: list-item;
  }

  .ipb-richtext-editor__content :deep(a) {
    color: var(--ipb-primary-color, #2563eb);
    text-decoration: underline;
  }

  .ipb-richtext-editor__content :deep(s) {
    text-decoration: line-through;
  }

  .ipb-richtext-editor__content :deep(u) {
    text-decoration: underline;
  }
</style>
