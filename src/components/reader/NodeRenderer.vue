<script setup lang="ts">
  import { computed, defineComponent, type PropType } from 'vue';
  import type { INode } from '@/types/node';
  import { resolveComponent } from '@/core/registry';
  import { interpolateProps } from '@/core/tree';
  import { createPageBuilderError, reportDevDiagnostic } from '@/core/errors';
  import ErrorBoundary from '@/components/shared/ErrorBoundary.vue';

  const props = defineProps({
    node: {
      type: Object as PropType<INode>,
      required: true,
    },
    variables: {
      type: Object as PropType<Record<string, string>>,
      default: () => ({}),
    },
    markNodes: {
      type: Boolean,
      default: false,
    },
  });

  const reportedDiagnostics = new Set<string>();

  function reportOnce(key: string, message: string, details?: Record<string, unknown>) {
    if (reportedDiagnostics.has(key)) return;
    reportedDiagnostics.add(key);
    reportDevDiagnostic('NodeRenderer', createPageBuilderError('RENDER_FAILURE', message, { details }));
  }

  function isNodeObject(value: unknown): value is INode {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const maybeNode = value as Partial<INode>;
    if (typeof maybeNode.id !== 'number' || !Number.isFinite(maybeNode.id)) return false;
    if (typeof maybeNode.name !== 'string' || maybeNode.name.trim().length === 0) return false;
    if (!(maybeNode.slot === null || typeof maybeNode.slot === 'string')) return false;
    if (
      typeof maybeNode.props !== 'object' ||
      maybeNode.props === null ||
      Array.isArray(maybeNode.props)
    ) {
      return false;
    }
    return Array.isArray(maybeNode.children);
  }

  function sanitizeVariables(rawVariables: unknown): Record<string, string> {
    if (!rawVariables || typeof rawVariables !== 'object' || Array.isArray(rawVariables)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(rawVariables).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  }

  const safeNode = computed<INode | null>(() => {
    if (isNodeObject(props.node)) return props.node;
    reportOnce('invalid-node', '[PageBuilder] NodeRenderer received an invalid node payload.', {
      node: props.node,
    });
    return null;
  });

  const safeVariables = computed<Record<string, string>>(() => sanitizeVariables(props.variables));

  const NodeRenderCrash = defineComponent({
    name: 'NodeRenderCrash',
    props: {
      error: {
        type: null as unknown as PropType<unknown>,
        required: true,
      },
    },
    setup(localProps) {
      return () => {
        const reason =
          localProps.error instanceof Error ? localProps.error : new Error(String(localProps.error));
        throw reason;
      };
    },
  });

  const resolutionResult = computed(() => {
    if (!safeNode.value) {
      return {
        component: NodeRenderCrash,
        error: createPageBuilderError(
          'INVALID_NODE',
          '[PageBuilder] Cannot render node because its payload is invalid.',
        ),
      };
    }

    try {
      return { component: resolveComponent(safeNode.value.name), error: null as unknown };
    } catch (error) {
      reportOnce(
        `missing-component:${safeNode.value.name}`,
        `[PageBuilder] Component "${safeNode.value.name}" could not be resolved.`,
        { nodeId: safeNode.value.id },
      );
      return { component: NodeRenderCrash, error };
    }
  });

  const resolvedComponent = computed(() => resolutionResult.value.component);
  const resolvedProps = computed(() => {
    if (resolutionResult.value.error !== null) {
      return { error: resolutionResult.value.error };
    }

    if (!safeNode.value) {
      return {
        error: createPageBuilderError(
          'INVALID_NODE',
          '[PageBuilder] Cannot render props for an invalid node payload.',
        ),
      };
    }

    try {
      return interpolateProps(safeNode.value.props, safeVariables.value);
    } catch (error) {
      reportOnce(
        `prop-interpolation:${safeNode.value.id}`,
        `[PageBuilder] Failed to interpolate props for node "${safeNode.value.name}".`,
        { nodeId: safeNode.value.id },
      );
      return { error };
    }
  });
  const markerAttrs = computed(() => {
    if (!props.markNodes || !safeNode.value) return {};
    return {
      'data-ipb-node-id': String(safeNode.value.id),
      'data-ipb-component': safeNode.value.name,
      ...(safeNode.value.readonly ? { 'data-ipb-readonly': 'true' } : {}),
    };
  });
  const renderedAttrs = computed(() => ({
    ...resolvedProps.value,
    ...markerAttrs.value,
  }));

  const slotGroups = computed(() => {
    const groups: Record<string, INode[]> = {};
    if (!safeNode.value) return groups;

    for (const child of safeNode.value.children) {
      if (!isNodeObject(child)) {
        reportOnce(
          `invalid-child:${safeNode.value.id}`,
          `[PageBuilder] Ignoring invalid child node while rendering "${safeNode.value.name}".`,
          { parentNodeId: safeNode.value.id },
        );
        continue;
      }
      const slotName = child.slot ?? 'default';
      if (!groups[slotName]) groups[slotName] = [];
      groups[slotName].push(child);
    }
    return groups;
  });
</script>

<template>
  <div v-if="!safeNode" class="ipb-node-renderer__invalid" role="alert">
    This block is invalid and could not be rendered.
  </div>
  <ErrorBoundary
    v-else
    fallback-message="This block could not be rendered."
    :show-details-in-dev="true"
    diagnostic-context="NodeRenderer"
  >
    <component :is="resolvedComponent" v-bind="renderedAttrs">
      <template v-for="(children, slotName) in slotGroups" :key="slotName" #[slotName]>
        <NodeRenderer
          v-for="child in children"
          :key="child.id"
          :node="child"
          :variables="safeVariables"
          :mark-nodes="markNodes"
        />
      </template>
    </component>
  </ErrorBoundary>
</template>

<style scoped>
  .ipb-node-renderer__invalid {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #f3d1d1;
    border-radius: 0.375rem;
    background-color: #fff5f5;
    color: #7a1f1f;
    font-size: 0.825rem;
    line-height: 1.35;
  }
</style>
