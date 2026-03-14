import { normalizeSafeHtmlTag, sanitizeRichTextHtml, sanitizeUrlByKind } from '@/core/sanitize';

describe('sanitizeRichTextHtml', () => {
  it('removes script payloads, event attributes, and unsafe links', () => {
    const sanitized = sanitizeRichTextHtml(
      '<p onclick="alert(1)">Hello <a href="javascript:alert(1)">world</a></p><script>alert(1)</script>',
    );

    expect(sanitized).toBe('<p>Hello world</p>');
  });

  it('keeps allowed formatting tags and hardens target=_blank links', () => {
    const sanitized = sanitizeRichTextHtml(
      '<p><a href="https://example.test" target="_blank">Example</a> <strong>bold</strong></p>',
    );

    expect(sanitized).toBe(
      '<p><a href="https://example.test" target="_blank" rel="noopener noreferrer">Example</a> <strong>bold</strong></p>',
    );
  });
});

describe('normalizeSafeHtmlTag', () => {
  it('returns a safe normalized tag when allowed', () => {
    expect(normalizeSafeHtmlTag(' H2 ')).toBe('h2');
  });

  it('falls back to the provided safe fallback when tag is unsafe', () => {
    expect(normalizeSafeHtmlTag('script', 'p')).toBe('p');
  });

  it('falls back to div when tag and fallback are unsafe', () => {
    expect(normalizeSafeHtmlTag('script', 'iframe')).toBe('div');
  });
});

describe('sanitizeUrlByKind', () => {
  it('allows safe link URLs and blocks dangerous ones', () => {
    expect(sanitizeUrlByKind('https://example.test/docs', 'link')).toBe('https://example.test/docs');
    expect(sanitizeUrlByKind('mailto:hello@example.test', 'link')).toBe('mailto:hello@example.test');
    expect(sanitizeUrlByKind('tel:+33123456789', 'link')).toBe('tel:+33123456789');
    expect(sanitizeUrlByKind('javascript:alert(1)', 'link')).toBe('');
    expect(sanitizeUrlByKind('data:text/html;base64,PHNjcmlwdD4=', 'link')).toBe('');
  });

  it('applies media/background specific allowlists', () => {
    expect(sanitizeUrlByKind('/assets/hero.png', 'media')).toBe('/assets/hero.png');
    expect(sanitizeUrlByKind('blob:https://example.test/123', 'media')).toBe('blob:https://example.test/123');
    expect(sanitizeUrlByKind('data:image/png;base64,AAAA', 'media')).toBe('data:image/png;base64,AAAA');
    expect(sanitizeUrlByKind('data:image/svg+xml;base64,AAAA', 'media')).toBe('');
    expect(sanitizeUrlByKind('blob:https://example.test/123', 'background')).toBe('');
    expect(sanitizeUrlByKind('javascript:alert(1)', 'background')).toBe('');
  });
});
