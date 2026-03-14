import {
  createIframeBridgeChild,
  createIframeBridgeParent,
  createIframeBridgeKeydownMessage,
  createIframeBridgePointerMessage,
  createIframeBridgeReadyMessage,
  mountIframeBridgeDomListeners,
  parseIframeBridgeMessage,
} from '@/core/iframe-bridge';

describe('iframe bridge utility', () => {
  it('routes lifecycle, pointer, and keydown messages for trusted origin/source', () => {
    const onReady = vi.fn();
    const onPointer = vi.fn();
    const onKeydown = vi.fn();
    const sessionToken = 'trusted-session-token';

    const bridge = createIframeBridgeParent({
      hostWindow: window,
      expectedSource: window,
      expectedOrigin: window.location.origin,
      expectedSessionToken: sessionToken,
      onReady,
      onPointer,
      onKeydown,
    });

    try {
      window.dispatchEvent(
        new MessageEvent('message', {
          source: window,
          origin: window.location.origin,
          data: createIframeBridgeReadyMessage(sessionToken),
        }),
      );
      window.dispatchEvent(
        new MessageEvent('message', {
          source: window,
          origin: window.location.origin,
          data: createIframeBridgePointerMessage({
            interaction: 'select',
            nodeId: 12,
          }, sessionToken),
        }),
      );
      window.dispatchEvent(
        new MessageEvent('message', {
          source: window,
          origin: window.location.origin,
          data: createIframeBridgeKeydownMessage({
            key: 'Delete',
            code: 'Delete',
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
            altKey: false,
            defaultPrevented: false,
            isEditable: false,
          }, sessionToken),
        }),
      );

      expect(onReady).toHaveBeenCalledTimes(1);
      expect(onPointer).toHaveBeenCalledWith({ interaction: 'select', nodeId: 12 });
      expect(onKeydown).toHaveBeenCalledWith({
        key: 'Delete',
        code: 'Delete',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        defaultPrevented: false,
        isEditable: false,
      });
    } finally {
      bridge.dispose();
    }
  });

  it('rejects messages from untrusted origin or source', () => {
    const onPointer = vi.fn();
    const sessionToken = 'trusted-session-token';
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const otherWindow = iframe.contentWindow;

    const bridge = createIframeBridgeParent({
      hostWindow: window,
      expectedSource: window,
      expectedOrigin: window.location.origin,
      expectedSessionToken: sessionToken,
      onPointer,
    });

    try {
      if (otherWindow) {
        window.dispatchEvent(
          new MessageEvent('message', {
            source: otherWindow,
            origin: window.location.origin,
            data: createIframeBridgePointerMessage({
              interaction: 'hover',
              nodeId: 2,
            }, sessionToken),
          }),
        );
      }

      window.dispatchEvent(
        new MessageEvent('message', {
          source: window,
          origin: 'https://evil.example',
          data: createIframeBridgePointerMessage({
            interaction: 'hover',
            nodeId: 3,
          }, sessionToken),
        }),
      );

      window.dispatchEvent(
        new MessageEvent('message', {
          source: window,
          origin: window.location.origin,
          data: createIframeBridgePointerMessage({
            interaction: 'hover',
            nodeId: 4,
          }, 'other-session-token'),
        }),
      );

      expect(onPointer).not.toHaveBeenCalled();
    } finally {
      bridge.dispose();
      iframe.remove();
    }
  });

  it('mounts DOM listeners and emits typed bridge payloads', () => {
    const frameDocument = document.implementation.createHTMLDocument('iframe-doc');
    const contentRoot = frameDocument.createElement('div');
    const childNode = frameDocument.createElement('button');
    childNode.setAttribute('data-node-id', '9');
    contentRoot.appendChild(childNode);
    frameDocument.body.appendChild(contentRoot);

    const bridge = createIframeBridgeChild({
      targetWindow: window,
      targetOrigin: window.location.origin,
      sessionToken: 'bridge-session-token',
    });

    const postReadySpy = vi.spyOn(bridge, 'postReady');
    const postPointerSpy = vi.spyOn(bridge, 'postPointer');
    const postKeydownSpy = vi.spyOn(bridge, 'postKeydown');

    const teardown = mountIframeBridgeDomListeners({
      frameDocument,
      contentRoot,
      bridge,
      resolveNodeId: (target) => {
        if (!(target instanceof Element)) return null;
        const nodeId = target.getAttribute('data-node-id');
        return nodeId ? Number(nodeId) : null;
      },
      isEditableTarget: (target) => target instanceof HTMLInputElement,
    });

    try {
      expect(postReadySpy).toHaveBeenCalledTimes(1);

      childNode.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      childNode.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));
      contentRoot.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true }));
      childNode.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 24 }),
      );

      expect(postPointerSpy).toHaveBeenCalledWith({ interaction: 'select', nodeId: 9 });
      expect(postPointerSpy).toHaveBeenCalledWith({ interaction: 'hover', nodeId: 9 });
      expect(postPointerSpy).toHaveBeenCalledWith({ interaction: 'hover', nodeId: null });
      expect(postPointerSpy).toHaveBeenCalledWith({
        interaction: 'context',
        nodeId: 9,
        clientX: 40,
        clientY: 24,
      });

      const saveShortcut = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 's',
        code: 'KeyS',
        ctrlKey: true,
      });
      frameDocument.dispatchEvent(saveShortcut);

      expect(saveShortcut.defaultPrevented).toBe(true);
      expect(postKeydownSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 's',
          code: 'KeyS',
          ctrlKey: true,
          defaultPrevented: false,
          isEditable: false,
        }),
      );
    } finally {
      teardown();
    }
  });

  it('parses typed bridge envelopes and rejects invalid payloads', () => {
    const sessionToken = 'trusted-session-token';
    const parsed = parseIframeBridgeMessage(
      createIframeBridgePointerMessage({ interaction: 'hover', nodeId: 5 }, sessionToken),
      { expectedSessionToken: sessionToken },
    );
    expect(parsed).toEqual(
      createIframeBridgePointerMessage({ interaction: 'hover', nodeId: 5 }, sessionToken),
    );

    expect(
      parseIframeBridgeMessage(createIframeBridgeReadyMessage(sessionToken), {
        expectedSessionToken: 'different-session-token',
      }),
    ).toBeNull();

    expect(
      parseIframeBridgeMessage(
        {
          namespace: '@improba/page-builder/iframe-bridge',
          version: 1,
          channel: 'lifecycle',
          payload: { state: 'ready' },
        },
        { allowLegacyNoSessionToken: true },
      ),
    ).not.toBeNull();

    expect(
      parseIframeBridgeMessage({
        namespace: '@improba/page-builder/iframe-bridge',
        version: 1,
        sessionToken,
        channel: 'pointer',
        payload: { interaction: 'context', nodeId: 5 },
      }),
    ).toBeNull();
  });
});
