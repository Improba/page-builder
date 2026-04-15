<script setup lang="ts">
  import { ref } from 'vue';
  import { PageBuilder } from '../src';
  import type { IPageData, INode, PageBuilderMode } from '../src';

  const mode = ref<PageBuilderMode>('edit');

  const pageData: IPageData = {
    meta: {
      id: 'demo-page',
      name: 'Demo Page',
      url: '/demo',
      status: 'draft',
    },
    tree: {
      id: 100,
      name: 'PbContainer',
      slot: null,
      props: {},
      children: [
        {
          id: 10,
          name: 'PbColumn',
          slot: 'default',
          props: { gap: '24px', padding: '24px' },
          children: [
            {
              id: 1,
              name: 'PbText',
              slot: 'default',
              props: { content: '<h1>Welcome to the Page Builder</h1>', tag: 'div' },
              children: [],
            },
            {
              id: 2,
              name: 'PbRow',
              slot: 'default',
              props: { gap: '16px' },
              children: [
                {
                  id: 3,
                  name: 'PbText',
                  slot: 'default',
                  props: { content: '<p>Left column content</p>', tag: 'div' },
                  children: [],
                },
                {
                  id: 4,
                  name: 'PbText',
                  slot: 'default',
                  props: { content: '<p>Right column content</p>', tag: 'div' },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
    contentRootId: 10,
    maxId: 100,
    variables: {
      PAGE_NAME: 'Demo Page',
      PAGE_URL: '/demo',
    },
  };

  function handleSave(payload: { content: INode; maxId: number }) {
    console.log('[Playground] Save:', JSON.stringify(payload, null, 2));
  }

  function handleChange(tree: INode) {
    console.log('[Playground] Tree changed:', tree);
  }
</script>

<template>
  <div class="playground">
    <div class="playground__mode-switch">
      <button :class="{ active: mode === 'read' }" @click="mode = 'read'">Read Mode</button>
      <button :class="{ active: mode === 'edit' }" @click="mode = 'edit'">Edit Mode</button>
    </div>

    <PageBuilder
      :page-data="pageData"
      :mode="mode"
      @save="handleSave"
      @change="handleChange"
    />
  </div>
</template>

<style>
  .playground__mode-switch {
    display: flex;
    gap: 8px;
    padding: 8px 16px;
    background: #1a1a2e;
    z-index: 1000;
  }

  .playground__mode-switch button {
    padding: 6px 16px;
    border: 1px solid #444;
    border-radius: 4px;
    background: #2a2a3e;
    color: #ccc;
    cursor: pointer;
    font-size: 13px;
  }

  .playground__mode-switch button.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: #fff;
  }
</style>
