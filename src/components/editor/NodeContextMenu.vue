<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref, watch, type CSSProperties, type PropType } from 'vue';
  import { usePageBuilderI18n } from '@/i18n';

  export type NodeContextMenuAction = 'duplicate' | 'delete' | 'move-up' | 'move-down';

  const props = defineProps({
    open: { type: Boolean, default: false },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    canDelete: { type: Boolean, default: true },
    canMoveUp: { type: Boolean, default: false },
    canMoveDown: { type: Boolean, default: false },
  });

  const emit = defineEmits<{
    action: [action: NodeContextMenuAction];
    close: [];
  }>();
  const { t } = usePageBuilderI18n();

  interface MenuItem {
    key: NodeContextMenuAction;
    label: string;
    danger?: boolean;
    disabled?: boolean;
  }

  const menuStyle = computed<CSSProperties>(() => ({
    top: `${props.y}px`,
    left: `${props.x}px`,
  }));

  const menuItems = computed<MenuItem[]>(() => [
    { key: 'duplicate', label: t('contextMenu.duplicate') },
    { key: 'move-up', label: t('contextMenu.moveUp'), disabled: !props.canMoveUp },
    { key: 'move-down', label: t('contextMenu.moveDown'), disabled: !props.canMoveDown },
    { key: 'delete', label: t('contextMenu.delete'), danger: true, disabled: !props.canDelete },
  ]);

  function handleAction(action: NodeContextMenuAction, disabled?: boolean) {
    if (disabled) return;
    emit('action', action);
  }

  const menuRootRef = ref<HTMLElement | null>(null);
  const previousFocusedElement = ref<HTMLElement | null>(null);

  function getFocusableItems(): HTMLButtonElement[] {
    if (!menuRootRef.value) return [];
    return Array.from(menuRootRef.value.querySelectorAll<HTMLButtonElement>('.ipb-node-context-menu__item')).filter(
      (item) => !item.disabled,
    );
  }

  function focusFirstMenuItem() {
    const [firstItem] = getFocusableItems();
    firstItem?.focus();
  }

  function restorePreviousFocus() {
    if (previousFocusedElement.value instanceof HTMLElement) {
      previousFocusedElement.value.focus();
    }
    previousFocusedElement.value = null;
  }

  function handleMenuKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      emit('close');
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      emit('close');
      return;
    }

    const items = getFocusableItems();
    if (items.length === 0) return;

    const activeElement = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    const activeIndex = activeElement ? items.indexOf(activeElement) : -1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = activeIndex < 0 ? 0 : (activeIndex + 1) % items.length;
      items[nextIndex]?.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = activeIndex < 0 ? items.length - 1 : (activeIndex - 1 + items.length) % items.length;
      items[nextIndex]?.focus();
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  function handleMenuFocusOut(event: FocusEvent) {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node)) {
      emit('close');
      return;
    }
    if (!menuRootRef.value?.contains(nextTarget)) {
      emit('close');
    }
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen) {
        previousFocusedElement.value = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        void nextTick(() => {
          focusFirstMenuItem();
        });
        return;
      }

      restorePreviousFocus();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    restorePreviousFocus();
  });
</script>

<template>
  <div
    v-if="open"
    ref="menuRootRef"
    class="ipb-node-context-menu"
    :style="menuStyle"
    role="menu"
    :aria-label="t('contextMenu.ariaLabel')"
    aria-orientation="vertical"
    tabindex="-1"
    @click.stop
    @contextmenu.prevent
    @keydown="handleMenuKeydown"
    @focusout="handleMenuFocusOut"
  >
    <button
      v-for="item in menuItems"
      :key="item.key"
      type="button"
      class="ipb-node-context-menu__item"
      :class="{ 'ipb-node-context-menu__item--danger': item.danger }"
      :disabled="item.disabled"
      :data-action="item.key"
      role="menuitem"
      :aria-disabled="item.disabled ? 'true' : undefined"
      @click="handleAction(item.key, item.disabled)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped>
  .ipb-node-context-menu {
    position: absolute;
    z-index: 30;
    display: flex;
    flex-direction: column;
    min-width: 148px;
    padding: 6px;
    border: 1px solid var(--ipb-border-color, #d1d5db);
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
  }

  .ipb-node-context-menu__item {
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--ipb-text-color, #111827);
    font-size: 13px;
    line-height: 1.4;
    text-align: left;
    padding: 7px 10px;
    cursor: pointer;
  }

  .ipb-node-context-menu__item:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.1);
  }

  .ipb-node-context-menu__item:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: -1px;
  }

  .ipb-node-context-menu__item--danger {
    color: var(--ipb-danger-color, #dc2626);
  }

  .ipb-node-context-menu__item:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
