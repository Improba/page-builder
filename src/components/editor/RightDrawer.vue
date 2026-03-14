<script setup lang="ts">
  import { computed, nextTick, ref, watch, type PropType, type Component } from 'vue';
  import type { IPropDefinition, PropEditorType } from '@/types/component';
  import type { INode } from '@/types/node';
  import { findNodeById } from '@/core/tree';
  import { getComponent } from '@/core/registry';
  import { usePageBuilderI18n } from '@/i18n';
  import { DEFAULT_PROP_EDITOR, PROP_EDITORS } from './prop-editors';

  const props = defineProps({
    open: { type: Boolean, default: false },
    selectedNodeId: { type: Number as PropType<number | null>, default: null },
    content: { type: Object as PropType<INode>, required: true },
  });

  const emit = defineEmits<{
    toggle: [];
    'update-props': [nodeId: number, props: Record<string, unknown>];
    delete: [nodeId: number];
    duplicate: [nodeId: number];
  }>();
  const { t } = usePageBuilderI18n();
  const drawerRef = ref<HTMLElement | null>(null);
  const drawerToggleRef = ref<HTMLButtonElement | null>(null);
  const focusContentOnNextOpen = ref(false);

  const selectedNode = computed(() => {
    if (props.selectedNodeId === null) return null;
    return findNodeById(props.content, props.selectedNodeId) ?? null;
  });

  const componentDef = computed(() => {
    if (!selectedNode.value) return null;
    return getComponent(selectedNode.value.name) ?? null;
  });

  function getPropValue(propDef: IPropDefinition): unknown {
    if (!selectedNode.value) return propDef.defaultValue ?? '';
    return selectedNode.value.props[propDef.key] ?? propDef.defaultValue ?? '';
  }

  function getEditorComponent(type: PropEditorType): Component {
    return PROP_EDITORS[type] ?? DEFAULT_PROP_EDITOR;
  }

  function getEditorBindings(propDef: IPropDefinition): Record<string, unknown> {
    const modelValue = getPropValue(propDef);

    if (propDef.type === 'number') {
      return {
        modelValue,
        min: propDef.validation?.min,
        max: propDef.validation?.max,
      };
    }

    if (propDef.type === 'select') {
      return {
        modelValue,
        options: propDef.options ?? [],
      };
    }

    if (propDef.type === 'image' || propDef.type === 'url') {
      return { modelValue };
    }

    if (
      propDef.type === 'text' ||
      propDef.type === 'textarea' ||
      propDef.type === 'richtext' ||
      propDef.type === 'json'
    ) {
      return {
        modelValue,
        placeholder: propDef.label,
      };
    }

    return { modelValue };
  }

  function handlePropUpdate(propKey: string, value: unknown) {
    if (!selectedNode.value) return;
    emit('update-props', selectedNode.value.id, { [propKey]: value });
  }

  const DRAWER_CONTENT_ID = 'ipb-right-drawer-content';

  function getPropLabelId(propKey: string): string {
    return `ipb-right-drawer-prop-label-${propKey}`;
  }

  function getFirstFocusableContentControl(): HTMLElement | null {
    const drawer = drawerRef.value;
    if (!drawer) return null;

    return drawer.querySelector<HTMLElement>(
      `#${DRAWER_CONTENT_ID} input:not([disabled]), #${DRAWER_CONTENT_ID} select:not([disabled]), #${DRAWER_CONTENT_ID} textarea:not([disabled]), #${DRAWER_CONTENT_ID} button:not([disabled]), #${DRAWER_CONTENT_ID} [contenteditable]:not([contenteditable="false"]), #${DRAWER_CONTENT_ID} [tabindex]:not([tabindex="-1"])`,
    );
  }

  function focusDrawerContent() {
    getFirstFocusableContentControl()?.focus();
  }

  function handleDrawerToggle() {
    focusContentOnNextOpen.value = !props.open;
    emit('toggle');
  }

  watch(
    () => props.open,
    (isOpen, wasOpen) => {
      if (isOpen && !wasOpen && focusContentOnNextOpen.value) {
        void nextTick(() => {
          focusDrawerContent();
        });
      }

      if (!isOpen && wasOpen) {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement && drawerRef.value?.contains(activeElement)) {
          void nextTick(() => {
            drawerToggleRef.value?.focus();
          });
        }
      }

      if (isOpen !== wasOpen) {
        focusContentOnNextOpen.value = false;
      }
    },
  );
</script>

<template>
  <aside
    ref="drawerRef"
    class="ipb-right-drawer"
    :class="{ 'ipb-right-drawer--open': open }"
    role="complementary"
    :aria-label="t('rightDrawer.aria.componentProperties')"
  >
    <div class="ipb-right-drawer__header">
      <span class="ipb-right-drawer__title" id="ipb-right-drawer-title">{{ t('rightDrawer.title') }}</span>
      <button
        ref="drawerToggleRef"
        type="button"
        class="ipb-right-drawer__toggle"
        :aria-label="t('rightDrawer.toggle.ariaLabel')"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="DRAWER_CONTENT_ID"
        @click="handleDrawerToggle"
      >
        {{ open ? '▶' : '◀' }}
      </button>
    </div>

    <div
      v-if="open && selectedNode && componentDef"
      :id="DRAWER_CONTENT_ID"
      class="ipb-right-drawer__content"
      role="region"
      aria-labelledby="ipb-right-drawer-title"
    >
      <div class="ipb-right-drawer__section">
        <h3 class="ipb-right-drawer__section-title">{{ componentDef.label }}</h3>
        <p v-if="componentDef.description" class="ipb-right-drawer__description">
          {{ componentDef.description }}
        </p>
      </div>

      <div class="ipb-right-drawer__section">
        <h4 class="ipb-right-drawer__section-subtitle">{{ t('rightDrawer.section.properties') }}</h4>
        <!-- Property editors will be rendered here based on editableProps -->
        <div
          v-for="propDef in componentDef.editableProps"
          :key="propDef.key"
          class="ipb-right-drawer__prop"
          :data-prop-key="propDef.key"
        >
          <label :id="getPropLabelId(propDef.key)" class="ipb-right-drawer__prop-label">{{ propDef.label }}</label>
          <component
            :is="getEditorComponent(propDef.type)"
            class="ipb-right-drawer__prop-editor"
            v-bind="getEditorBindings(propDef)"
            :aria-labelledby="getPropLabelId(propDef.key)"
            @update:model-value="handlePropUpdate(propDef.key, $event)"
          />
        </div>
      </div>

      <div class="ipb-right-drawer__actions">
        <button
          type="button"
          class="ipb-right-drawer__btn"
          :aria-label="t('rightDrawer.actions.duplicate.ariaLabel')"
          @click="emit('duplicate', selectedNode!.id)"
        >
          {{ t('rightDrawer.actions.duplicate') }}
        </button>
        <button
          type="button"
          class="ipb-right-drawer__btn ipb-right-drawer__btn--danger"
          :disabled="selectedNode!.readonly"
          :aria-label="t('rightDrawer.actions.delete.ariaLabel')"
          @click="emit('delete', selectedNode!.id)"
        >
          {{ t('rightDrawer.actions.delete') }}
        </button>
      </div>
    </div>

    <div v-else-if="open" class="ipb-right-drawer__empty">
      <p>{{ t('rightDrawer.empty') }}</p>
    </div>
  </aside>
</template>

<style scoped>
  .ipb-right-drawer {
    width: 48px;
    background: var(--ipb-drawer-bg, #fff);
    border-left: 1px solid var(--ipb-border-color, #e0e0e0);
    transition: width 0.2s ease;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }

  .ipb-right-drawer--open {
    width: 320px;
  }

  .ipb-right-drawer__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    padding: 12px;
    border-bottom: 1px solid var(--ipb-border-color, #e0e0e0);
  }

  .ipb-right-drawer__title {
    font-weight: 600;
    font-size: 14px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ipb-right-drawer__toggle {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    padding: 4px;
  }

  .ipb-right-drawer__toggle:focus-visible,
  .ipb-right-drawer__btn:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: 1px;
  }

  .ipb-right-drawer__content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .ipb-right-drawer__section {
    margin-bottom: 20px;
  }

  .ipb-right-drawer__section-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 4px;
  }

  .ipb-right-drawer__section-subtitle {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ipb-text-muted, #6b7280);
    margin: 0 0 12px;
  }

  .ipb-right-drawer__description {
    font-size: 13px;
    color: var(--ipb-text-muted, #6b7280);
    margin: 0;
  }

  .ipb-right-drawer__prop {
    margin-bottom: 12px;
  }

  .ipb-right-drawer__prop-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .ipb-right-drawer__prop-editor {
    width: 100%;
  }

  .ipb-right-drawer__actions {
    display: flex;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid var(--ipb-border-color, #e0e0e0);
  }

  .ipb-right-drawer__btn {
    flex: 1;
    padding: 8px;
    border: 1px solid var(--ipb-border-color, #e0e0e0);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
  }

  .ipb-right-drawer__btn--danger {
    color: var(--ipb-danger-color, #dc2626);
    border-color: var(--ipb-danger-color, #dc2626);
  }

  .ipb-right-drawer__btn--danger:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .ipb-right-drawer__empty {
    padding: 24px 16px;
    text-align: center;
    color: var(--ipb-text-muted, #6b7280);
    font-size: 13px;
  }
</style>
