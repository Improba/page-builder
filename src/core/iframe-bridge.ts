export const IFRAME_BRIDGE_NAMESPACE = '@improba/page-builder/iframe-bridge';
export const IFRAME_BRIDGE_VERSION = 1 as const;

type IframeBridgeChannel = 'keydown' | 'pointer' | 'lifecycle';
export type IframeBridgeSessionToken = string;

interface IframeBridgeEnvelope<TChannel extends IframeBridgeChannel, TPayload> {
  namespace: typeof IFRAME_BRIDGE_NAMESPACE;
  version: typeof IFRAME_BRIDGE_VERSION;
  sessionToken: IframeBridgeSessionToken;
  channel: TChannel;
  payload: TPayload;
}

export interface IframeBridgeKeydownPayload {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  isEditable: boolean;
}

export type IframeBridgePointerInteraction = 'hover' | 'select' | 'context';

interface IframeBridgePointerBasePayload {
  interaction: IframeBridgePointerInteraction;
  nodeId: number | null;
}

interface IframeBridgePointerContextPayload extends IframeBridgePointerBasePayload {
  interaction: 'context';
  clientX: number;
  clientY: number;
}

interface IframeBridgePointerHoverOrSelectPayload extends IframeBridgePointerBasePayload {
  interaction: 'hover' | 'select';
}

export type IframeBridgePointerPayload = IframeBridgePointerContextPayload | IframeBridgePointerHoverOrSelectPayload;

export interface IframeBridgeLifecyclePayload {
  state: 'ready';
}

export type IframeBridgeKeydownMessage = IframeBridgeEnvelope<'keydown', IframeBridgeKeydownPayload>;
export type IframeBridgePointerMessage = IframeBridgeEnvelope<'pointer', IframeBridgePointerPayload>;
export type IframeBridgeLifecycleMessage = IframeBridgeEnvelope<'lifecycle', IframeBridgeLifecyclePayload>;

export type IframeBridgeMessage = IframeBridgeKeydownMessage | IframeBridgePointerMessage | IframeBridgeLifecycleMessage;

function createIframeBridgeEnvelope<TChannel extends IframeBridgeChannel, TPayload>(
  channel: TChannel,
  payload: TPayload,
  sessionToken: IframeBridgeSessionToken,
): IframeBridgeEnvelope<TChannel, TPayload> {
  return {
    namespace: IFRAME_BRIDGE_NAMESPACE,
    version: IFRAME_BRIDGE_VERSION,
    sessionToken,
    channel,
    payload,
  };
}

export function createIframeBridgeSessionToken(): IframeBridgeSessionToken {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createIframeBridgeReadyMessage(sessionToken: IframeBridgeSessionToken): IframeBridgeLifecycleMessage {
  return createIframeBridgeEnvelope('lifecycle', { state: 'ready' }, sessionToken);
}

export function createIframeBridgePointerMessage(
  payload: IframeBridgePointerPayload,
  sessionToken: IframeBridgeSessionToken,
): IframeBridgePointerMessage {
  return createIframeBridgeEnvelope('pointer', payload, sessionToken);
}

export function createIframeBridgeKeydownMessage(
  payload: IframeBridgeKeydownPayload,
  sessionToken: IframeBridgeSessionToken,
): IframeBridgeKeydownMessage {
  return createIframeBridgeEnvelope('keydown', payload, sessionToken);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function parsePointerPayload(payload: unknown): IframeBridgePointerPayload | null {
  if (!isRecord(payload)) return null;

  const interaction = payload.interaction;
  const maybeNodeId = payload.nodeId;
  if (interaction !== 'hover' && interaction !== 'select' && interaction !== 'context') return null;
  if (maybeNodeId !== null && typeof maybeNodeId !== 'number') return null;
  if (typeof maybeNodeId === 'number' && !Number.isInteger(maybeNodeId)) return null;

  const nodeId: number | null = maybeNodeId;

  if (interaction === 'context') {
    const clientX = payload.clientX;
    const clientY = payload.clientY;
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return null;
    return { interaction, nodeId, clientX, clientY };
  }

  return { interaction, nodeId };
}

function parseKeydownPayload(payload: unknown): IframeBridgeKeydownPayload | null {
  if (!isRecord(payload)) return null;

  if (typeof payload.key !== 'string') return null;
  if (typeof payload.code !== 'string') return null;
  if (typeof payload.ctrlKey !== 'boolean') return null;
  if (typeof payload.metaKey !== 'boolean') return null;
  if (typeof payload.shiftKey !== 'boolean') return null;
  if (typeof payload.altKey !== 'boolean') return null;
  if (typeof payload.defaultPrevented !== 'boolean') return null;
  if (typeof payload.isEditable !== 'boolean') return null;

  return {
    key: payload.key,
    code: payload.code,
    ctrlKey: payload.ctrlKey,
    metaKey: payload.metaKey,
    shiftKey: payload.shiftKey,
    altKey: payload.altKey,
    defaultPrevented: payload.defaultPrevented,
    isEditable: payload.isEditable,
  };
}

export interface ParseIframeBridgeMessageOptions {
  expectedSessionToken?: IframeBridgeSessionToken;
  allowLegacyNoSessionToken?: boolean;
}

export function parseIframeBridgeMessage(
  value: unknown,
  options: ParseIframeBridgeMessageOptions = {},
): IframeBridgeMessage | null {
  if (!isRecord(value)) return null;
  if (value.namespace !== IFRAME_BRIDGE_NAMESPACE) return null;
  if (value.version !== IFRAME_BRIDGE_VERSION) return null;
  if (value.channel !== 'keydown' && value.channel !== 'pointer' && value.channel !== 'lifecycle') return null;

  const sessionTokenCandidate = value.sessionToken;
  const hasValidSessionToken = typeof sessionTokenCandidate === 'string' && sessionTokenCandidate.length > 0;
  if (options.expectedSessionToken) {
    if (!hasValidSessionToken || sessionTokenCandidate !== options.expectedSessionToken) return null;
  } else if (!hasValidSessionToken && !options.allowLegacyNoSessionToken) {
    return null;
  }

  const sessionToken = hasValidSessionToken ? sessionTokenCandidate : '';

  if (value.channel === 'lifecycle') {
    if (!isRecord(value.payload) || value.payload.state !== 'ready') return null;
    return createIframeBridgeReadyMessage(sessionToken);
  }

  if (value.channel === 'pointer') {
    const payload = parsePointerPayload(value.payload);
    if (!payload) return null;
    return createIframeBridgePointerMessage(payload, sessionToken);
  }

  const payload = parseKeydownPayload(value.payload);
  if (!payload) return null;
  return createIframeBridgeKeydownMessage(payload, sessionToken);
}

export interface IframeBridgeParentOptions {
  hostWindow: Window;
  expectedSource: Window;
  expectedOrigin: string;
  expectedSessionToken?: IframeBridgeSessionToken;
  allowLegacyNoSessionToken?: boolean;
  onReady?: () => void;
  onPointer?: (payload: IframeBridgePointerPayload) => void;
  onKeydown?: (payload: IframeBridgeKeydownPayload) => void;
}

export interface IframeBridgeParent {
  dispose: () => void;
}

export function createIframeBridgeParent(options: IframeBridgeParentOptions): IframeBridgeParent {
  const onMessage = (event: MessageEvent) => {
    if (event.source !== options.expectedSource) return;
    if (event.origin !== options.expectedOrigin) return;

    const message = parseIframeBridgeMessage(event.data, {
      expectedSessionToken: options.expectedSessionToken,
      allowLegacyNoSessionToken: options.allowLegacyNoSessionToken ?? !options.expectedSessionToken,
    });
    if (!message) return;

    if (message.channel === 'lifecycle') {
      options.onReady?.();
      return;
    }

    if (message.channel === 'pointer') {
      options.onPointer?.(message.payload);
      return;
    }

    options.onKeydown?.(message.payload);
  };

  options.hostWindow.addEventListener('message', onMessage);
  return {
    dispose: () => {
      options.hostWindow.removeEventListener('message', onMessage);
    },
  };
}

export interface IframeBridgeChild {
  postReady: () => void;
  postPointer: (payload: IframeBridgePointerPayload) => void;
  postKeydown: (payload: IframeBridgeKeydownPayload) => void;
}

export interface IframeBridgeChildOptions {
  targetWindow: Window;
  targetOrigin: string;
  sessionToken: IframeBridgeSessionToken;
}

export function createIframeBridgeChild(options: IframeBridgeChildOptions): IframeBridgeChild {
  return {
    postReady: () => {
      options.targetWindow.postMessage(createIframeBridgeReadyMessage(options.sessionToken), options.targetOrigin);
    },
    postPointer: (payload) => {
      options.targetWindow.postMessage(
        createIframeBridgePointerMessage(payload, options.sessionToken),
        options.targetOrigin,
      );
    },
    postKeydown: (payload) => {
      options.targetWindow.postMessage(
        createIframeBridgeKeydownMessage(payload, options.sessionToken),
        options.targetOrigin,
      );
    },
  };
}

export interface MountIframeBridgeDomListenersOptions {
  frameDocument: Document;
  contentRoot: HTMLElement;
  bridge: IframeBridgeChild;
  resolveNodeId: (target: EventTarget | null) => number | null;
  isEditableTarget: (target: EventTarget | null) => boolean;
}

function shouldAutoPreventShortcut(payload: IframeBridgeKeydownPayload): boolean {
  if (payload.defaultPrevented || payload.isEditable) return false;

  const hasModifier = payload.ctrlKey || payload.metaKey;
  const key = payload.key.toLowerCase();
  const code = payload.code.toLowerCase();

  if (hasModifier && (key === 'z' || key === 'y' || key === 's')) return true;

  const isDeleteKey = key === 'delete' || key === 'backspace' || code === 'delete' || code === 'backspace';
  return isDeleteKey && !payload.ctrlKey && !payload.metaKey && !payload.altKey;
}

export function mountIframeBridgeDomListeners(options: MountIframeBridgeDomListenersOptions): () => void {
  const handleClick = (event: MouseEvent) => {
    options.bridge.postPointer({
      interaction: 'select',
      nodeId: options.resolveNodeId(event.target),
    });
  };

  const handleMouseMove = (event: MouseEvent) => {
    options.bridge.postPointer({
      interaction: 'hover',
      nodeId: options.resolveNodeId(event.target),
    });
  };

  const handleMouseLeave = () => {
    options.bridge.postPointer({
      interaction: 'hover',
      nodeId: null,
    });
  };

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    options.bridge.postPointer({
      interaction: 'context',
      nodeId: options.resolveNodeId(event.target),
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };

  const handleKeydown = (event: KeyboardEvent) => {
    const payload: IframeBridgeKeydownPayload = {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      defaultPrevented: event.defaultPrevented,
      isEditable:
        options.isEditableTarget(event.target) ||
        options.isEditableTarget(options.frameDocument.activeElement),
    };

    if (shouldAutoPreventShortcut(payload)) {
      event.preventDefault();
    }

    options.bridge.postKeydown(payload);
  };

  options.contentRoot.addEventListener('click', handleClick);
  options.contentRoot.addEventListener('mousemove', handleMouseMove);
  options.contentRoot.addEventListener('mouseleave', handleMouseLeave);
  options.contentRoot.addEventListener('contextmenu', handleContextMenu);
  options.frameDocument.addEventListener('keydown', handleKeydown);

  options.bridge.postReady();

  return () => {
    options.contentRoot.removeEventListener('click', handleClick);
    options.contentRoot.removeEventListener('mousemove', handleMouseMove);
    options.contentRoot.removeEventListener('mouseleave', handleMouseLeave);
    options.contentRoot.removeEventListener('contextmenu', handleContextMenu);
    options.frameDocument.removeEventListener('keydown', handleKeydown);
  };
}
