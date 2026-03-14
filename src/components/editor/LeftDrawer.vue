<script setup lang="ts">
  import { computed, nextTick, ref, watch, type PropType } from 'vue';
  import { getComponentsByCategory } from '@/core/registry';
  import type { IComponentDefinition } from '@/types/component';
  import type { INode } from '@/types/node';
  import { usePageBuilderI18n } from '@/i18n';
  import TreePanel from './TreePanel.vue';

  const props = defineProps({
    open: { type: Boolean, default: true },
    content: { type: Object as PropType<INode | null>, default: null },
    selectedNodeId: { type: Number as PropType<number | null>, default: null },
  });

  const emit = defineEmits<{
    toggle: [];
    dragStart: [componentName: string];
    dragEnd: [];
    add: [componentName: string];
    select: [nodeId: number];
  }>();

  const categorizedComponents = computed(() => getComponentsByCategory());
  const { t } = usePageBuilderI18n();
  const searchQuery = ref('');
  const treeOpen = ref(true);
  const DRAWER_CONTENT_ID = 'ipb-left-drawer-content';
  const TREE_PANEL_REGION_ID = 'ipb-left-drawer-tree-panel';
  const drawerRef = ref<HTMLElement | null>(null);
  const drawerToggleRef = ref<HTMLButtonElement | null>(null);
  const searchInputRef = ref<HTMLInputElement | null>(null);
  const focusContentOnNextOpen = ref(false);

  const filteredCategorizedComponents = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) {
      return categorizedComponents.value;
    }

    const filtered = new Map<string, IComponentDefinition[]>();
    for (const [category, components] of categorizedComponents.value) {
      const matching = components.filter((comp) => {
        const searchable = [comp.name, comp.label, comp.description ?? '', category, comp.category];
        return searchable.some((value) => value.toLowerCase().includes(query));
      });
      if (matching.length > 0) {
        filtered.set(category, matching);
      }
    }

    return filtered;
  });

  function handleDragStart(componentName: string, event: DragEvent) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-ipb-component', componentName);
      event.dataTransfer.setData('text/plain', componentName);
    }
    emit('dragStart', componentName);
  }

  function handleDragEnd() {
    emit('dragEnd');
  }

  function handleComponentAdd(componentName: string) {
    emit('add', componentName);
  }

  function toggleTree() {
    treeOpen.value = !treeOpen.value;
  }

  function getFirstFocusableDrawerControl(): HTMLElement | null {
    const drawer = drawerRef.value;
    if (!drawer) return null;

    return drawer.querySelector<HTMLElement>(
      `#${DRAWER_CONTENT_ID} button:not([disabled]), #${DRAWER_CONTENT_ID} input:not([disabled]), #${DRAWER_CONTENT_ID} select:not([disabled]), #${DRAWER_CONTENT_ID} textarea:not([disabled]), #${DRAWER_CONTENT_ID} [tabindex]:not([tabindex="-1"])`,
    );
  }

  function focusDrawerContent() {
    searchInputRef.value?.focus();
    if (document.activeElement === searchInputRef.value) return;
    getFirstFocusableDrawerControl()?.focus();
  }

  function handleDrawerToggle() {
    focusContentOnNextOpen.value = !props.open;
    emit('toggle');
  }

  function getCategoryAriaLabel(category: string): string {
    return t('leftDrawer.category.ariaLabel', { category });
  }

  function getDragAriaLabel(label: string): string {
    return t('leftDrawer.component.dragAriaLabel', { label });
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
    class="ipb-left-drawer"
    :class="{ 'ipb-left-drawer--open': open }"
    :aria-label="t('leftDrawer.aria.componentPalette')"
    role="complementary"
  >
    <div class="ipb-left-drawer__header">
      <span class="ipb-left-drawer__title" id="ipb-left-drawer-title">{{ t('leftDrawer.title') }}</span>
      <button
        ref="drawerToggleRef"
        type="button"
        class="ipb-left-drawer__toggle"
        :aria-label="t('leftDrawer.toggle.ariaLabel')"
        :aria-expanded="open ? 'true' : 'false'"
        :aria-controls="DRAWER_CONTENT_ID"
        @click="handleDrawerToggle"
      >
        {{ open ? '◀' : '▶' }}
      </button>
    </div>

    <div
      v-if="open"
      :id="DRAWER_CONTENT_ID"
      class="ipb-left-drawer__content"
      role="region"
      aria-labelledby="ipb-left-drawer-title"
    >
      <div class="ipb-left-drawer__section">
        <h3 class="ipb-left-drawer__section-title" id="ipb-left-drawer-components-title">
          {{ t('leftDrawer.section.components') }}
        </h3>
        <div class="ipb-left-drawer__search" role="search">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            class="ipb-left-drawer__search-input"
            :placeholder="t('leftDrawer.search.placeholder')"
            :aria-label="t('leftDrawer.search.ariaLabel')"
          />
        </div>
        <div
          v-for="[category, components] in filteredCategorizedComponents"
          :key="category"
          class="ipb-left-drawer__category"
        >
          <h4 class="ipb-left-drawer__category-title">{{ category }}</h4>
          <div class="ipb-left-drawer__component-list" role="group" :aria-label="getCategoryAriaLabel(category)">
            <button
              v-for="comp in components"
              :key="comp.name"
              type="button"
              class="ipb-left-drawer__component-item"
              draggable="true"
              :title="comp.description"
              :aria-label="getDragAriaLabel(comp.label)"
              :aria-keyshortcuts="'Enter Space'"
              @click="handleComponentAdd(comp.name)"
              @dragstart="handleDragStart(comp.name, $event)"
              @dragend="handleDragEnd"
            >
              <span class="ipb-left-drawer__component-icon" aria-hidden="true">{{ comp.icon ?? '◻' }}</span>
              <span class="ipb-left-drawer__component-label">{{ comp.label }}</span>
            </button>
          </div>
        </div>
        <p v-if="filteredCategorizedComponents.size === 0" class="ipb-left-drawer__empty">
          {{ t('leftDrawer.empty') }}
        </p>
      </div>

      <div v-if="content" class="ipb-left-drawer__section ipb-left-drawer__section--tree">
        <div class="ipb-left-drawer__section-header">
          <h3 class="ipb-left-drawer__section-title">{{ t('leftDrawer.section.tree') }}</h3>
          <button
            type="button"
            class="ipb-left-drawer__section-toggle"
            :aria-expanded="treeOpen ? 'true' : 'false'"
            :aria-controls="TREE_PANEL_REGION_ID"
            :aria-label="t('leftDrawer.tree.toggle.ariaLabel')"
            @click="toggleTree"
          >
            {{ treeOpen ? '−' : '+' }}
          </button>
        </div>

        <div v-if="treeOpen" :id="TREE_PANEL_REGION_ID" role="region" :aria-label="t('treePanel.ariaLabel')">
          <TreePanel :content="content" :selected-node-id="selectedNodeId" @select="emit('select', $event)" />
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
  .ipb-left-drawer {
    width: 48px;
    background: var(--ipb-drawer-bg, #fff);
    border-right: 1px solid var(--ipb-border-color, #e0e0e0);
    transition: width 0.2s ease;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }

  .ipb-left-drawer--open {
    width: 260px;
  }

  .ipb-left-drawer__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    padding: 12px;
    border-bottom: 1px solid var(--ipb-border-color, #e0e0e0);
  }

  .ipb-left-drawer__title {
    font-weight: 600;
    font-size: 14px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ipb-left-drawer__toggle {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    padding: 4px;
  }

  .ipb-left-drawer__toggle:focus-visible,
  .ipb-left-drawer__section-toggle:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: 1px;
    border-radius: 4px;
  }

  .ipb-left-drawer__content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ipb-left-drawer__section {
    min-width: 0;
  }

  .ipb-left-drawer__search {
    margin-top: 8px;
    margin-bottom: 8px;
  }

  .ipb-left-drawer__search-input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--ipb-border-color, #e0e0e0);
    border-radius: 4px;
    background: var(--ipb-input-bg, #fff);
    color: var(--ipb-text-color, #111827);
    font-size: 12px;
  }

  .ipb-left-drawer__search-input:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: 1px;
  }

  .ipb-left-drawer__section--tree {
    padding-top: 8px;
    border-top: 1px solid var(--ipb-border-color, #e0e0e0);
  }

  .ipb-left-drawer__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .ipb-left-drawer__section-title {
    margin: 0;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ipb-text-muted, #6b7280);
  }

  .ipb-left-drawer__section-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px 4px;
    font-size: 14px;
    line-height: 1;
  }

  .ipb-left-drawer__category-title {
    font-size: 11px;
    font-weight: 600;
    margin: 10px 0 8px;
  }

  .ipb-left-drawer__component-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .ipb-left-drawer__component-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 4px;
    cursor: grab;
    transition: background 0.15s;
    font-size: 13px;
    width: 100%;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
  }

  .ipb-left-drawer__component-item:hover {
    background: var(--ipb-hover-bg, #f5f5f5);
  }

  .ipb-left-drawer__component-item:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: -1px;
  }

  .ipb-left-drawer__component-icon {
    font-size: 16px;
    width: 24px;
    text-align: center;
  }

  .ipb-left-drawer__empty {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--ipb-text-muted, #6b7280);
  }
</style>
