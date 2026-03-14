const SAFE_TEXT_CONTAINER_TAGS = new Set([
  'div',
  'p',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'section',
  'article',
  'blockquote',
]);

const SAFE_RICH_TEXT_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'u',
  'ul',
]);

const DROP_ENTIRELY_TAGS = new Set([
  'base',
  'embed',
  'form',
  'iframe',
  'input',
  'link',
  'math',
  'meta',
  'noscript',
  'object',
  'script',
  'style',
  'svg',
  'template',
  'textarea',
]);

const SAFE_LINK_TARGETS = new Set(['_blank', '_parent', '_self', '_top']);
const SAFE_LINK_REL_TOKENS = new Set(['nofollow', 'noopener', 'noreferrer', 'sponsored', 'ugc']);
const SAFE_DATA_IMAGE_URL_PATTERN = /^data:image\/(?:avif|bmp|gif|jpe?g|png|webp);base64,[a-z0-9+/=\s]+$/i;

function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, '');
}

function normalizeProtocolProbe(value: string): string {
  return stripControlCharacters(value).replace(/\s+/g, '');
}

function sanitizeLinkRel(rel: string): string {
  const safeTokens = rel
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => SAFE_LINK_REL_TOKENS.has(token));
  return Array.from(new Set(safeTokens)).join(' ');
}

function withSafeBlankTargetRel(existingRel: string | null): string {
  const safeRel = sanitizeLinkRel(existingRel ?? '');
  const relTokens = new Set(safeRel.split(/\s+/).filter(Boolean));
  relTokens.add('noopener');
  relTokens.add('noreferrer');
  return Array.from(relTokens).join(' ');
}

function createSanitizationDocument(): Document | null {
  if (
    typeof document !== 'undefined'
    && typeof document.implementation?.createHTMLDocument === 'function'
  ) {
    return document.implementation.createHTMLDocument('');
  }

  if (typeof DOMParser !== 'undefined') {
    const parsed = new DOMParser().parseFromString('<!doctype html><html><body></body></html>', 'text/html');
    if (parsed?.body) return parsed;
  }

  return null;
}

function escapeHtml(rawHtml: string): string {
  return rawHtml
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sanitizeRichTextAttributes(source: Element, target: HTMLElement): void {
  const tagName = target.tagName.toLowerCase();

  for (const attribute of Array.from(source.attributes)) {
    const attrName = attribute.name.toLowerCase();
    const attrValue = stripControlCharacters(attribute.value).trim();

    if (attrValue.length === 0 || attrName.startsWith('on')) continue;

    if (attrName === 'title') {
      target.setAttribute('title', attrValue);
      continue;
    }

    if (tagName !== 'a') continue;

    if (attrName === 'href') {
      const sanitizedHref = sanitizeUrlByKind(attrValue, 'link');
      if (sanitizedHref.length > 0) target.setAttribute('href', sanitizedHref);
      continue;
    }

    if (attrName === 'target') {
      const normalizedTarget = attrValue.toLowerCase();
      if (SAFE_LINK_TARGETS.has(normalizedTarget)) {
        target.setAttribute('target', normalizedTarget);
      }
      continue;
    }

    if (attrName === 'rel') {
      const sanitizedRel = sanitizeLinkRel(attrValue);
      if (sanitizedRel.length > 0) target.setAttribute('rel', sanitizedRel);
    }
  }

  if (tagName === 'a' && target.getAttribute('target') === '_blank') {
    target.setAttribute('rel', withSafeBlankTargetRel(target.getAttribute('rel')));
  }
}

function sanitizeRichTextChildren(source: ParentNode, target: ParentNode, doc: Document): void {
  for (const node of Array.from(source.childNodes)) {
    if (node.nodeType === 3) {
      target.appendChild(doc.createTextNode(node.textContent ?? ''));
      continue;
    }

    if (node.nodeType !== 1) continue;

    const sourceElement = node as Element;
    const sourceTagName = sourceElement.tagName.toLowerCase();

    if (DROP_ENTIRELY_TAGS.has(sourceTagName)) continue;

    if (!SAFE_RICH_TEXT_TAGS.has(sourceTagName)) {
      const unwrappedChildren = doc.createDocumentFragment();
      sanitizeRichTextChildren(sourceElement, unwrappedChildren, doc);
      target.appendChild(unwrappedChildren);
      continue;
    }

    const sanitizedElement = doc.createElement(sourceTagName);
    sanitizeRichTextAttributes(sourceElement, sanitizedElement);
    sanitizeRichTextChildren(sourceElement, sanitizedElement, doc);

    if (sourceTagName === 'a' && !sanitizedElement.getAttribute('href')) {
      const safeChildren = doc.createDocumentFragment();
      while (sanitizedElement.firstChild) {
        safeChildren.appendChild(sanitizedElement.firstChild);
      }
      target.appendChild(safeChildren);
      continue;
    }

    target.appendChild(sanitizedElement);
  }
}

export function sanitizeRichTextHtml(html: string): string {
  const rawHtml = typeof html === 'string' ? html : '';
  if (rawHtml.length === 0) return '';

  const doc = createSanitizationDocument();
  if (!doc) return escapeHtml(rawHtml);

  const source = doc.createElement('div');
  source.innerHTML = rawHtml;

  const output = doc.createElement('div');
  sanitizeRichTextChildren(source, output, doc);
  return output.innerHTML;
}

export function normalizeSafeHtmlTag(tag: unknown, fallback = 'div'): string {
  const normalizedFallback = typeof fallback === 'string' ? fallback.trim().toLowerCase() : 'div';
  const safeFallback = SAFE_TEXT_CONTAINER_TAGS.has(normalizedFallback) ? normalizedFallback : 'div';
  if (typeof tag !== 'string') return safeFallback;

  const normalizedTag = tag.trim().toLowerCase();
  if (!SAFE_TEXT_CONTAINER_TAGS.has(normalizedTag)) return safeFallback;
  return normalizedTag;
}

export function sanitizeUrlByKind(url: string, kind: 'link' | 'media' | 'background'): string {
  const sanitizedInput = stripControlCharacters(url).trim();
  if (sanitizedInput.length === 0) return '';

  const protocolProbe = normalizeProtocolProbe(sanitizedInput).toLowerCase();
  const schemeMatch = protocolProbe.match(/^([a-z][a-z0-9+.-]*):/i);
  const scheme = schemeMatch?.[1];

  if (!scheme) return sanitizedInput;

  if (scheme === 'http' || scheme === 'https') return sanitizedInput;

  if (kind === 'link' && (scheme === 'mailto' || scheme === 'tel')) {
    return sanitizedInput;
  }

  if (kind === 'media' && scheme === 'blob') {
    return sanitizedInput;
  }

  if ((kind === 'media' || kind === 'background') && scheme === 'data') {
    return SAFE_DATA_IMAGE_URL_PATTERN.test(protocolProbe) ? sanitizedInput : '';
  }

  return '';
}
