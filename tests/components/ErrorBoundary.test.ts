import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import ErrorBoundary from '@/components/shared/ErrorBoundary.vue';

const SafeChild = defineComponent({
  name: 'SafeChild',
  setup() {
    return () => h('div', { class: 'safe-child' }, 'safe');
  },
});

const ThrowOnRender = defineComponent({
  name: 'ThrowOnRender',
  setup() {
    return () => {
      throw new Error('Render explosion');
    };
  },
});

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error is thrown', () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: () => h(SafeChild),
      },
    });

    expect(wrapper.find('.safe-child').exists()).toBe(true);
    expect(wrapper.find('.ipb-error-boundary').exists()).toBe(false);
  });

  it('shows fallback UI when a child throws during render', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: () => h(ThrowOnRender),
      },
    });
    await nextTick();

    expect(wrapper.find('.ipb-error-boundary').exists()).toBe(true);
    expect(wrapper.text()).toContain('Something went wrong while rendering this section.');
  });

  it('uses a custom fallback message when provided', async () => {
    const wrapper = mount(ErrorBoundary, {
      props: {
        fallbackMessage: 'Custom fallback',
      },
      slots: {
        default: () => h(ThrowOnRender),
      },
    });
    await nextTick();

    expect(wrapper.text()).toContain('Custom fallback');
  });

  it('shows error details only when explicitly enabled in dev mode', async () => {
    const wrapper = mount(ErrorBoundary, {
      props: {
        showDetailsInDev: true,
      },
      slots: {
        default: () => h(ThrowOnRender),
      },
    });
    await nextTick();

    const details = wrapper.find('.ipb-error-boundary__details');
    if (import.meta.env.DEV) {
      expect(details.exists()).toBe(true);
      expect(details.text()).toContain('Render explosion');
    } else {
      expect(details.exists()).toBe(false);
    }
  });

  it('surfaces diagnostics in dev mode without crashing UI fallback', async () => {
    const wrapper = mount(ErrorBoundary, {
      props: {
        diagnosticContext: 'ErrorBoundaryTest',
      },
      slots: {
        default: () => h(ThrowOnRender),
      },
    });
    await nextTick();

    expect(wrapper.find('.ipb-error-boundary').exists()).toBe(true);

    if (import.meta.env.DEV) {
      const diagnostics = consoleErrorSpy.mock.calls.map((call) => String(call[0] ?? ''));
      expect(
        diagnostics.some((message) => message.includes('[PageBuilder][ErrorBoundaryTest]')),
      ).toBe(true);
    }
  });
});
