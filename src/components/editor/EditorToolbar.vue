<script setup lang="ts">
  import { nextTick, ref, type ComponentPublicInstance, type PropType } from 'vue';
  import type { ViewportPreset } from '@/types/editor';
  import { VIEWPORT_PRESETS } from '@/types/editor';
  import { usePageBuilderI18n } from '@/i18n';

  const MIN_VIEWPORT_WIDTH = 240;
  const MIN_VIEWPORT_HEIGHT = 320;
  const MAX_VIEWPORT_WIDTH = 3840;
  const MAX_VIEWPORT_HEIGHT = 4320;

  const props = defineProps({
    canUndo: { type: Boolean, default: false },
    canRedo: { type: Boolean, default: false },
    isDirty: { type: Boolean, default: false },
    viewport: { type: String as PropType<ViewportPreset>, default: 'desktop' },
    customViewportWidth: { type: Number, default: 1024 },
    customViewportHeight: { type: Number, default: 768 },
    activeViewportWidth: { type: Number as PropType<number | null>, default: null },
    activeViewportHeight: { type: Number as PropType<number | null>, default: null },
  });

  const emit = defineEmits<{
    undo: [];
    redo: [];
    save: [];
    'viewport-change': [preset: ViewportPreset];
    'custom-viewport-change': [payload: { width: number; height: number }];
  }>();

  const { t } = usePageBuilderI18n();

  const VIEWPORT_LABEL_KEYS: Record<ViewportPreset, string> = {
    desktop: 'toolbar.viewport.desktop',
    tablet: 'toolbar.viewport.tablet',
    mobile: 'toolbar.viewport.mobile',
    custom: 'toolbar.viewport.custom',
  };
  const VIEWPORT_ORDER: ViewportPreset[] = ['desktop', 'tablet', 'mobile', 'custom'];
  const viewportButtonRefs = ref(new Map<ViewportPreset, HTMLButtonElement>());

  function getViewportLabel(preset: ViewportPreset): string {
    return t(VIEWPORT_LABEL_KEYS[preset]);
  }

  function getViewportSwitchAriaLabel(preset: ViewportPreset): string {
    return t('toolbar.viewport.switchAriaLabel', { viewport: getViewportLabel(preset) });
  }

  function setViewportButtonRef(preset: ViewportPreset, element: Element | ComponentPublicInstance | null) {
    const maybeElement =
      element instanceof HTMLButtonElement
        ? element
        : element && '$el' in element && element.$el instanceof HTMLButtonElement
          ? element.$el
          : null;

    if (maybeElement) {
      viewportButtonRefs.value.set(preset, maybeElement);
      return;
    }

    viewportButtonRefs.value.delete(preset);
  }

  function getViewportIndex(preset: ViewportPreset): number {
    return VIEWPORT_ORDER.indexOf(preset);
  }

  function focusViewportButton(preset: ViewportPreset) {
    viewportButtonRefs.value.get(preset)?.focus();
  }

  function handleViewportKeydown(event: KeyboardEvent, currentPreset: ViewportPreset) {
    const currentIndex = getViewportIndex(currentPreset);
    if (currentIndex < 0) return;

    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'ArrowDown' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }

    event.preventDefault();

    let nextIndex = currentIndex;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + VIEWPORT_ORDER.length) % VIEWPORT_ORDER.length;
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % VIEWPORT_ORDER.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = VIEWPORT_ORDER.length - 1;
    }

    const nextPreset = VIEWPORT_ORDER[nextIndex];
    emit('viewport-change', nextPreset);
    void nextTick(() => {
      focusViewportButton(nextPreset);
    });
  }

  function clampViewportSize(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  function parseViewportSize(value: string): number | null {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed);
  }

  function updateCustomViewportSize(dimension: 'width' | 'height', rawValue: string) {
    const parsed = parseViewportSize(rawValue);
    if (parsed === null) return;

    const width =
      dimension === 'width'
        ? clampViewportSize(parsed, MIN_VIEWPORT_WIDTH, MAX_VIEWPORT_WIDTH)
        : clampViewportSize(props.customViewportWidth, MIN_VIEWPORT_WIDTH, MAX_VIEWPORT_WIDTH);

    const height =
      dimension === 'height'
        ? clampViewportSize(parsed, MIN_VIEWPORT_HEIGHT, MAX_VIEWPORT_HEIGHT)
        : clampViewportSize(props.customViewportHeight, MIN_VIEWPORT_HEIGHT, MAX_VIEWPORT_HEIGHT);

    emit('custom-viewport-change', { width, height });
  }
</script>

<template>
  <header class="ipb-toolbar" role="toolbar" :aria-label="t('toolbar.aria.toolbar')">
    <div class="ipb-toolbar__left" role="group" :aria-label="t('toolbar.aria.historyControls')">
      <button
        type="button"
        class="ipb-toolbar__btn"
        :disabled="!canUndo"
        :aria-label="t('toolbar.undo.ariaLabel')"
        :title="t('toolbar.undo.title')"
        aria-keyshortcuts="Control+Z Meta+Z"
        @click="$emit('undo')"
      >
        ↩
      </button>
      <button
        type="button"
        class="ipb-toolbar__btn"
        :disabled="!canRedo"
        :aria-label="t('toolbar.redo.ariaLabel')"
        :title="t('toolbar.redo.title')"
        aria-keyshortcuts="Control+Y Meta+Y Control+Shift+Z Meta+Shift+Z"
        @click="$emit('redo')"
      >
        ↪
      </button>
    </div>

    <div class="ipb-toolbar__center" role="group" :aria-label="t('toolbar.aria.viewportControls')">
      <button
        v-for="(_, key) in VIEWPORT_PRESETS"
        :key="key"
        :ref="(element) => setViewportButtonRef(key as ViewportPreset, element)"
        type="button"
        class="ipb-toolbar__btn"
        :class="{ 'ipb-toolbar__btn--active': viewport === key }"
        :title="getViewportLabel(key as ViewportPreset)"
        :aria-label="getViewportSwitchAriaLabel(key as ViewportPreset)"
        :aria-pressed="viewport === key ? 'true' : 'false'"
        :data-viewport-preset="key"
        @click="$emit('viewport-change', key as ViewportPreset)"
        @keydown="handleViewportKeydown($event, key as ViewportPreset)"
      >
        {{ getViewportLabel(key as ViewportPreset) }}
      </button>
      <div v-if="viewport === 'custom'" class="ipb-toolbar__custom-size">
        <label class="ipb-toolbar__size-control">
          <span>{{ t('toolbar.viewport.width.short') }}</span>
          <input
            class="ipb-toolbar__size-input"
            type="number"
            inputmode="numeric"
            :aria-label="t('toolbar.viewport.width.ariaLabel')"
            :min="MIN_VIEWPORT_WIDTH"
            :max="MAX_VIEWPORT_WIDTH"
            :value="customViewportWidth"
            @input="updateCustomViewportSize('width', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="ipb-toolbar__size-control">
          <span>{{ t('toolbar.viewport.height.short') }}</span>
          <input
            class="ipb-toolbar__size-input"
            type="number"
            inputmode="numeric"
            :aria-label="t('toolbar.viewport.height.ariaLabel')"
            :min="MIN_VIEWPORT_HEIGHT"
            :max="MAX_VIEWPORT_HEIGHT"
            :value="customViewportHeight"
            @input="updateCustomViewportSize('height', ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
      <span
        v-if="activeViewportWidth !== null && activeViewportHeight !== null"
        class="ipb-toolbar__viewport-size"
        aria-live="polite"
      >
        {{ activeViewportWidth }}×{{ activeViewportHeight }}
      </span>
    </div>

    <div class="ipb-toolbar__right" role="group" :aria-label="t('toolbar.aria.saveControls')">
      <span
        v-if="isDirty"
        class="ipb-toolbar__dirty-indicator"
        role="status"
        :aria-label="t('toolbar.aria.unsavedChanges')"
      >
        ●
      </span>
      <button
        type="button"
        class="ipb-toolbar__btn ipb-toolbar__btn--primary"
        :aria-label="t('toolbar.save.ariaLabel')"
        :title="t('toolbar.save.title')"
        aria-keyshortcuts="Control+S Meta+S"
        @click="$emit('save')"
      >
        {{ t('toolbar.save') }}
      </button>
    </div>
  </header>
</template>

<style scoped>
  .ipb-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;
    padding: 0 16px;
    background: var(--ipb-toolbar-bg, #fff);
    border-bottom: 1px solid var(--ipb-border-color, #e0e0e0);
    flex-shrink: 0;
  }

  .ipb-toolbar__left,
  .ipb-toolbar__center,
  .ipb-toolbar__right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ipb-toolbar__btn {
    padding: 6px 12px;
    border: 1px solid var(--ipb-border-color, #e0e0e0);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.15s;
  }

  .ipb-toolbar__btn:focus-visible,
  .ipb-toolbar__size-input:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: 1px;
  }

  .ipb-toolbar__custom-size {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-left: 8px;
    padding-left: 8px;
    border-left: 1px solid var(--ipb-border-color, #e0e0e0);
  }

  .ipb-toolbar__size-control {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--ipb-text-secondary, #4b5563);
  }

  .ipb-toolbar__size-input {
    width: 72px;
    padding: 4px 6px;
    border: 1px solid var(--ipb-border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 12px;
  }

  .ipb-toolbar__viewport-size {
    margin-left: 8px;
    color: var(--ipb-text-secondary, #6b7280);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .ipb-toolbar__btn:hover:not(:disabled) {
    background: var(--ipb-hover-bg, #f5f5f5);
  }

  .ipb-toolbar__btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .ipb-toolbar__btn--active {
    background: var(--ipb-active-bg, #e8f0fe);
    border-color: var(--ipb-primary-color, #1a73e8);
    color: var(--ipb-primary-color, #1a73e8);
  }

  .ipb-toolbar__btn--primary {
    background: var(--ipb-primary-color, #1a73e8);
    color: #fff;
    border-color: var(--ipb-primary-color, #1a73e8);
  }

  .ipb-toolbar__btn--primary:hover {
    background: var(--ipb-primary-hover, #1557b0);
  }

  .ipb-toolbar__dirty-indicator {
    color: var(--ipb-warning-color, #f59e0b);
    font-size: 10px;
  }
</style>
