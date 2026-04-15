<script lang="ts">
  import { defineComponent, h, computed } from 'vue';
  import { icons as lucideIcons } from 'lucide';

  function kebabToPascal(str: string): string {
    return str
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  const LUCIDE_PREFIX = 'i-lucide-';

  function resolveLucideIconNodes(name: string): [string, Record<string, string>][] | null {
    if (!name.startsWith(LUCIDE_PREFIX)) return null;
    const iconKey = kebabToPascal(name.slice(LUCIDE_PREFIX.length));
    return (lucideIcons as Record<string, [string, Record<string, string>][]>)[iconKey] ?? null;
  }

  export default defineComponent({
    name: 'PbIcon',
    props: {
      icon: { type: String, default: undefined },
      size: { type: Number, default: 16 },
    },
    setup(props) {
      const lucideNodes = computed(() => {
        if (!props.icon) return null;
        return resolveLucideIconNodes(props.icon);
      });

      return () => {
        if (lucideNodes.value) {
          return h(
            'svg',
            {
              xmlns: 'http://www.w3.org/2000/svg',
              width: props.size,
              height: props.size,
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              'aria-hidden': 'true',
            },
            lucideNodes.value.map(([tag, attrs]) => h(tag, attrs)),
          );
        }

        return h('span', props.icon ?? '◻');
      };
    },
  });
</script>
